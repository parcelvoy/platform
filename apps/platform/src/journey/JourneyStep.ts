import { add, addDays, addHours, addMinutes, isEqual, isFuture, isPast, parse } from 'date-fns'
import Model from '../core/Model'
import { getCampaign, getCampaignSend, triggerCampaignSend } from '../campaigns/CampaignService'
import { crossTimezoneCopy, random, snakeCase, uuid } from '../utilities'
import { Database } from '../config/database'
import { compileTemplate } from '../render'
import { logger } from '../config/logger'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import Rule from '../rules/Rule'
import { check } from '../rules/RuleEngine'
import App from '../app'
import { rrulestr } from 'rrule'
import { JourneyState } from './JourneyState'
import { EventPostJob, UserPatchJob } from '../jobs'
import { exitUserFromJourney, getJourneyUserStepByExternalId } from './JourneyRepository'

export class JourneyUserStep extends Model {
    user_id!: number
    type!: string
    journey_id!: number
    step_id!: number
    delay_until?: Date
    entrance_id?: number
    ended_at?: Date
    data?: Record<string, unknown>
    ref?: string

    step?: JourneyStep

    static tableName = 'journey_user_step'

    static jsonAttributes = ['data']
    static virtualAttributes = ['step']

    static getDataMap(steps: JourneyStep[], userSteps: JourneyUserStep[]) {
        return userSteps.reduceRight<Record<string, unknown>>((a, { data, step_id }) => {
            const step = steps.find(s => s.id === step_id)
            if (data && step && !a[step.dataKey]) {
                a[step.dataKey] = data
            }
            return a
        }, {})
    }
}

export class JourneyStepChild extends Model {

    step_id!: number
    child_id!: number
    data?: Record<string, unknown>
    path?: string
    priority!: number

    static tableName = 'journey_step_child'
    static jsonAttributes: string[] = ['data']

}

export class JourneyStep extends Model {
    type!: string
    journey_id!: number
    name?: string
    data?: Record<string, unknown>
    external_id!: string
    data_key?: string // make data stored in user steps available in templates
    stats?: Record<string, number>
    stats_at?: Date
    next_scheduled_at: Date | null = null

    // UI variables
    x = 0
    y = 0

    static tableName = 'journey_steps'
    static jsonAttributes = ['data', 'stats']

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async getStats(steps: JourneyStep[]): Promise<{ [external_id: string]: any }> {
        return {}
    }

    static get type() { return snakeCase(this.name) }

    get dataKey(): string {
        return this.data_key ?? this.id.toString()
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {
        userStep.type = 'completed'
    }

    async next(state: JourneyState): Promise<undefined | number> {
        return state.childrenOf(this.id)[0]?.child_id
    }
}

export class JourneyEntrance extends JourneyStep {
    static type = 'entrance'

    trigger: 'none' | 'event' | 'schedule' = 'none'

    // event driven
    event_name!: string
    rule?: Rule
    multiple = false // multiple entries allowed
    concurrent = false

    // schedule driven
    list_id!: number
    schedule?: string

    parseJson(json: any) {
        super.parseJson(json)
        this.trigger = json?.data?.trigger ?? 'none'

        this.event_name = json?.data?.event_name
        this.rule = json?.data?.rule
        this.multiple = json?.data?.multiple
        this.concurrent = json?.data?.concurrent

        this.list_id = json?.data?.list_id
        this.schedule = json?.data?.schedule
    }

    nextDate(timezone: string, after = this.next_scheduled_at): Date | null {

        if (this.trigger !== 'schedule' || !after) return null

        if (this.schedule) {
            try {
                const rule = rrulestr(this.schedule, { tzid: timezone })

                // If there is no frequency, only run once
                if (!rule.options.freq) {
                    if (isEqual(rule.options.dtstart, after)) {
                        return null
                    }
                    return rule.options.dtstart
                }

                return rrulestr(this.schedule, { tzid: timezone }).after(after)
            } catch (err) {
                App.main.error.notify(err as Error, {
                    entranceId: this.id,
                })
            }
        }
        return null
    }

    static async create(journeyId: number, listId?: number, db?: Database): Promise<JourneyEntrance> {
        return await JourneyEntrance.insertAndFetch({
            type: this.type,
            external_id: uuid(),
            journey_id: journeyId,
            data: {
                list_id: listId,
            },
            x: 0,
            y: 0,
        }, db)
    }
}

export class JourneyExit extends JourneyStep {
    static type = 'exit'

    entrance_uuid!: string
    event_name!: string
    rule?: Rule

    parseJson(json: any) {
        super.parseJson(json)

        this.entrance_uuid = json?.data?.entrance_uuid
        this.event_name = json?.data?.event_name
        this.rule = json?.data?.rule
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {
        const entrance = await getJourneyUserStepByExternalId(this.journey_id, userStep.user_id, this.entrance_uuid)
        if (entrance) await exitUserFromJourney(userStep.user_id, entrance.id, this.journey_id)

        super.process(state, userStep)
    }

    static async create(journeyId: number, db?: Database): Promise<JourneyExit> {
        return await JourneyExit.insertAndFetch({
            external_id: uuid(),
            journey_id: journeyId,
            x: 0,
            y: 0,
        }, db)
    }
}

type JourneyDelayFormat = 'duration' | 'time' | 'date'
export class JourneyDelay extends JourneyStep {
    static type = 'delay'

    format: JourneyDelayFormat = 'duration'
    minutes = 0
    hours = 0
    days = 0
    time?: string
    date?: string

    parseJson(json: any) {
        super.parseJson(json)

        this.format = json?.data?.format
        this.minutes = json?.data?.minutes
        this.hours = json?.data?.hours
        this.days = json?.data?.days
        this.time = json?.data?.time
    }

    async process(state: JourneyState, userStep: JourneyUserStep) {

        // if no delay has been set yet, calculate one
        if (!userStep.delay_until) {
            userStep.delay_until = await this.offset(state)
            userStep.type = 'delay'
            return
        }

        // if delay has passed, change to completed
        if (!isFuture(userStep.delay_until)) {
            userStep.type = 'completed'
        }
    }

    private async offset(state: JourneyState): Promise<Date> {

        const timezone = await state.timezone()
        const baseDate = new Date()
        const time = this.time?.trim()
        const date = this.date?.trim()

        if (this.format === 'duration') {
            return add(baseDate, {
                days: this.days,
                hours: this.hours,
                minutes: this.minutes,
            })
        } else if (this.format === 'time' && time) {
            const localDate = utcToZonedTime(baseDate, timezone)
            const parsedDate = parse(time, 'HH:mm', baseDate)
            localDate.setMinutes(parsedDate.getMinutes())
            localDate.setHours(parsedDate.getHours())
            localDate.setSeconds(0)

            const nextDate = zonedTimeToUtc(localDate, timezone)

            // In case things are delayed, allow for up to 30 minutes
            // to pass before moving event to next day
            const dateWithOffset = add(nextDate, { minutes: 30 })
            if (isPast(dateWithOffset)) {
                return add(nextDate, { days: 1 })
            }
            return nextDate
        } else if (this.format === 'date' && date) {
            const compiledDate = compileTemplate(date)({
                user: state.user.flatten(),
                journey: state.stepData(),
            })
            const localDate = crossTimezoneCopy(new Date(compiledDate), 'UTC', timezone)
            if (localDate < baseDate) return baseDate
            return localDate
        }

        return baseDate
    }
}

export class JourneyAction extends JourneyStep {
    static type = 'action'

    campaign_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.campaign_id = json?.data?.campaign_id
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {

        const campaign = await getCampaign(this.campaign_id, state.user.project_id)

        if (!campaign) {
            userStep.type = 'error'
            return
        }

        if (userStep.type === 'action') {
            const send = await getCampaignSend(campaign.id, state.user.id, `${userStep.id}`)
            if (send?.state === 'failed') {
                userStep.type = 'error'
            }
            if (send?.state === 'sent') {
                userStep.type = 'completed'
            }
            return
        }

        userStep.type = 'action'

        // defer job construction so that we have the journey_user_step.id value
        state.job(async () => {
            const campaignSend = await getCampaignSend(campaign.id, state.user.id, `${userStep.id}`)

            const send = triggerCampaignSend({
                campaign,
                user: state.user,
                exists: !!campaignSend,
                reference_id: `${userStep.id}`,
                reference_type: 'journey',
            })

            if (!send) {
                userStep.type = 'error'
            }

            return send
        })
    }
}

export class JourneyGate extends JourneyStep {
    static type = 'gate'

    rule!: Rule

    parseJson(json: any) {
        super.parseJson(json)
        this.rule = json?.data?.rule
    }

    async next(state: JourneyState) {

        if (!this.rule) return

        const children = state.childrenOf(this.id)
        const passed = children.find(c => c.path === 'yes')
        const failed = children.find(c => c.path === 'no')

        if (!passed && !failed) return

        const events = await state.events()

        const params = {
            user: state.user.flatten(),
            events: events.map(e => e.flatten()),
            journey: state.stepData(),
        }

        return check(params, this.rule)
            ? passed?.child_id
            : failed?.child_id
    }
}

/**
 * randomly distribute users to different branches
 */
export class JourneyExperiment extends JourneyStep {
    static type = 'experiment'

    async next(state: JourneyState) {

        let children = state.childrenOf(this.id)
        if (!children.length) return undefined

        children = children.reduce<JourneyStepChild[]>((a, c) => {
            const proportion = c.data?.ratio
            if (typeof proportion === 'number' && !isNaN(proportion) && proportion > 0) {
                for (let i = 0; i < proportion; i++) {
                    a.push(c)
                }
            }
            return a
        }, [])

        // exit if no children paths have any proportions
        if (!children.length) return undefined

        return random(children).child_id
    }
}

/**
 * add user to another journey
 */
export class JourneyLink extends JourneyStep {
    static type = 'link'

    target_id!: number
    delay: '1 minute' | '15 minutes' | '1 hour' | '1 day' = '1 day'

    parseJson(json: any) {
        super.parseJson(json)
        this.target_id = json.data?.target_id
        this.delay = json.data?.delay ?? '1 day'
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {

        let step = state.steps.find(s => s.id === this.target_id)
        let delay_until = new Date()

        if (this.delay === '1 minute') {
            delay_until = addMinutes(delay_until, 1)
        } else if (this.delay === '15 minutes') {
            delay_until = addMinutes(delay_until, 15)
        } else if (this.delay === '1 hour') {
            delay_until = addHours(delay_until, 1)
        } else {
            delay_until = addDays(delay_until, 1)
        }

        if (!step) {
            step = await JourneyStep.first(q => q
                .join('journeys', 'journey_id', '=', 'journeys.id')
                .where('journeys.id', this.target_id)
                .where('journeys.project_id', state.user.project_id)
                .where('journeys.published', true)
                .whereNull('journeys.deleted_at')
                .where('type', 'entrance'),
            )
        }

        // error if invalid entrance step target
        if (!step) {
            userStep.type = 'error'
            return
        }

        // create an entrance in this/another journey, delay job will pick it up
        await JourneyUserStep.insert({
            journey_id: step.journey_id,
            step_id: step.id,
            user_id: state.user.id,
            type: 'delay',
            delay_until,
        })

        // mark this step as completed
        userStep.type = 'completed'
    }
}

export class JourneyBalancer extends JourneyStep {
    static type = 'balancer'

    rate_limit!: number
    rate_interval!: 'second' | 'minute' | 'hour' | 'day'

    parseJson(json: any) {
        super.parseJson(json)
        this.rate_limit = json.data?.rate_limit
        this.rate_interval = json.data?.rate_interval
    }

    async process(state: JourneyState, userStep: JourneyUserStep) {

        const children = state.childrenOf(this.id)
        if (!children.length) {
            userStep.type = 'completed'
            return
        }

        const child = random(children)
        userStep.data = { ...userStep.data, id: child.child_id }

        const limit = App.main.rateLimiter
        const { exceeded, expires } = await limit.consume(`journey_balancer:${child.child_id}`, {
            limit: this.rate_limit,
            msDuration: this.interval(),
        })
        if (exceeded) {
            userStep.type = 'delay'
            userStep.delay_until = add(new Date(), { seconds: expires })
            return
        }
        userStep.type = 'completed'
    }

    async next(state: JourneyState) {
        const data: any = state.stepData()[this.id]
        return data?.id as number
    }

    interval() {
        const intervals = {
            second: 1000,
            minute: 60 * 1000,
            hour: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
        }
        return intervals[this.rate_interval]
    }
}

export class JourneyUpdate extends JourneyStep {
    static type = 'update'

    template!: string

    parseJson(json: any) {
        super.parseJson(json)
        this.template = json.data?.template
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {

        if (this.template.trim()) {
            let value: any
            try {
                value = JSON.parse(compileTemplate(this.template)({
                    user: state.user.flatten(),
                    journey: state.stepData(),
                }))
                if (typeof value === 'object') {
                    state.user.data = {
                        ...state.user.data,
                        ...value,
                    }
                    await UserPatchJob.from({
                        project_id: state.user.project_id,
                        user: {
                            external_id: state.user.external_id,
                            data: value,
                        },
                    }).queue()
                }
            } catch (err: any) {
                logger.warn({
                    error: err.message,
                }, 'journey:user:error')
                userStep.type = 'error'
                return
            }
        }

        userStep.type = 'completed'
    }
}

export class JourneyEvent extends JourneyStep {
    static type = 'event'

    event_name!: string
    template!: string

    parseJson(json: any) {
        super.parseJson(json)
        this.event_name = json.data?.event_name
        this.template = json.data?.template
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {

        const template = this.template.trim()
        if (!template) return

        let value: any
        try {
            const jsonValue = JSON.parse(compileTemplate(this.template)({
                user: state.user.flatten(),
                journey: state.stepData(),
            }))
            value = typeof value === 'object' ? jsonValue : {}
        } catch {
            value = {}
        }

        await EventPostJob.from({
            project_id: state.user.project_id,
            event: {
                name: this.event_name,
                external_id: state.user.external_id,
                anonymous_id: state.user.anonymous_id,
                data: value,
            },
        }).queue()

        userStep.type = 'completed'
    }
}

export const journeyStepTypes = [
    JourneyEntrance,
    JourneyExit,
    JourneyDelay,
    JourneyAction,
    JourneyGate,
    JourneyExperiment,
    JourneyLink,
    JourneyUpdate,
    JourneyBalancer,
    JourneyEvent,
].reduce<Record<string, typeof JourneyStep>>((a, c) => {
    a[c.type] = c
    return a
}, {})

interface JourneyStepMapItem {
    type: string
    name?: string
    data?: Record<string, unknown>
    data_key?: string
    x: number
    y: number
    children?: Array<{
        external_id: string
        path?: string
        data?: Record<string, unknown>
    }>
}

export type JourneyStepMap = Record<string, JourneyStepMapItem & {
    stats?: Record<string, number>
    stats_at?: Date
    next_scheduled_at?: Date
    id?: number
}>

export type JourneyStepMapParams = Record<string, JourneyStepMapItem>

// This is async in case we ever want to fetch stats here
export async function toJourneyStepMap(steps: JourneyStep[], children: JourneyStepChild[]) {
    const editData: JourneyStepMap = {}

    for (const step of steps) {
        editData[step.external_id] = {
            type: step.type,
            name: step.name ?? '',
            data: step.data ?? {},
            data_key: step.data_key,
            x: step.x ?? 0,
            y: step.y ?? 0,
            children: children.reduce<JourneyStepMap[string]['children']>((a, { step_id, child_id, path, data }) => {
                if (step_id === step.id) {
                    const child = steps.find(s => s.id === child_id)
                    if (child) {
                        a!.push({
                            external_id: child.external_id,
                            path,
                            data,
                        })
                    }
                }
                return a
            }, []),
            stats: step.stats,
            next_scheduled_at: step.next_scheduled_at ?? undefined,
            id: step.id,
        }
    }

    return editData
}
