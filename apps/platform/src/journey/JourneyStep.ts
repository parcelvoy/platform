import { add, addDays, addMinutes, isFuture, isPast, parse } from 'date-fns'
import Model from '../core/Model'
import { User } from '../users/User'
import { getCampaign, getCampaignSend, sendCampaignJob } from '../campaigns/CampaignService'
import { crossTimezoneCopy, random, snakeCase, uuid } from '../utilities'
import { Database } from '../config/database'
import { compileTemplate } from '../render'
import { logger } from '../config/logger'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { JourneyState } from './JourneyService'
import Rule from '../rules/Rule'
import { check } from '../rules/RuleEngine'

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

    static tableName = 'journey_user_step'

    static getDataMap(steps: JourneyStep[], userSteps: JourneyUserStep[]) {
        return userSteps.reduceRight<Record<string, unknown>>((a, { data, step_id }) => {
            const step = steps.find(s => s.id === step_id)
            if (step?.data_key && !a[step.data_key]) {
                a[step.data_key] = data
            }
            return a
        }, {})
    }
}

export class JourneyStepChild extends Model {

    step_id!: number
    child_id!: number
    data?: Record<string, unknown>
    priority!: number

    static tableName = 'journey_step_child'
    static jsonAttributes: string[] = ['data']

}

export class JourneyStep extends Model {
    type!: string
    journey_id!: number
    data?: Record<string, unknown>
    external_id!: string
    data_key?: string // make data stored in user steps available in templates
    stats?: Record<string, number>
    stats_at?: Date

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

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {
        userStep.type = 'completed'
    }

    async next(state: JourneyState): Promise<undefined | number> {
        return state.childrenOf(this.id)[0]?.child_id
    }
}

export class JourneyEntrance extends JourneyStep {
    static type = 'entrance'

    list_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.list_id = json?.data.list_id
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
            const timezone = await state.timezone()
            userStep.delay_until = this.offset(new Date(), timezone)
            userStep.type = 'delay'
            return
        }

        // if delay has passed, change to completed
        if (!isFuture(userStep.delay_until)) {
            userStep.type = 'completed'
        }
    }

    private offset(baseDate: Date, timezone: string): Date {

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
            const localDate = crossTimezoneCopy(new Date(date), 'UTC', timezone)
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
            const send = await getCampaignSend(campaign.id, state.user.id, userStep.id)
            if (send?.state === 'sent') {
                userStep.type = 'completed'
            }
            return
        }

        userStep.type = 'action'

        // defer job construction so that we have the journey_user_step.id value
        state.job(() => sendCampaignJob({
            campaign,
            user: state.user,
            user_step_id: userStep.id,
        }))
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

        if (!children.length) return

        const [passed, failed] = children

        const events = await state.events()

        const params = {
            user: state.user.flatten(),
            events,
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

    target_entrance_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.target_entrance_id = json.data?.entrance_id
    }

    async process(state: JourneyState, userStep: JourneyUserStep): Promise<void> {

        let step = state.steps.find(s => s.id === this.target_entrance_id)
        let delay_until: undefined | Date

        if (step) {
            // restarting this same journey
            // TODO: should this be env configurable?
            delay_until = addDays(new Date(), 1)
        } else {
            step = await JourneyStep.first(q => q
                .join('journeys', 'journey_id', '=', 'journeys.id')
                .where('journeys.project_id', state.user.project_id)
                .where('journeys.published', true)
                .where('journey_steps.id', this.target_entrance_id),
            )
            delay_until = addMinutes(new Date(), 15)
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
            type: 'completed',
            delay_until,
        })

        // mark this step as completed
        userStep.type = 'completed'
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
                    await User.update(q => q.where('id', state.user.id), {
                        data: state.user.data,
                    })
                }
            } catch (err: any) {
                logger.warn({
                    error: err.message,
                }, 'Error while updating user')
                userStep.type = 'error'
                return
            }
        }

        userStep.type = 'completed'
    }
}

export const journeyStepTypes = [
    JourneyEntrance,
    JourneyDelay,
    JourneyAction,
    JourneyGate,
    JourneyExperiment,
    JourneyLink,
    JourneyUpdate,
].reduce<Record<string, typeof JourneyStep>>((a, c) => {
    a[c.type] = c
    return a
}, {})

export type JourneyStepMap = Record<
    string,
    {
        type: string
        data?: Record<string, unknown>
        data_key?: string
        x: number
        y: number
        children?: Array<{
            external_id: string
            data?: Record<string, unknown>
        }>
        stats?: Record<string, number>
        stats_at?: Date
    }
>

// This is async in case we ever want to fetch stats here
export async function toJourneyStepMap(steps: JourneyStep[], children: JourneyStepChild[]) {
    const editData: JourneyStepMap = {}

    for (const step of steps) {
        editData[step.external_id] = {
            type: step.type,
            data: step.data ?? {},
            data_key: step.data_key,
            x: step.x ?? 0,
            y: step.y ?? 0,
            children: children.reduce<JourneyStepMap[string]['children']>((a, { step_id, child_id, data }) => {
                if (step_id === step.id) {
                    const child = steps.find(s => s.id === child_id)
                    if (child) {
                        a!.push({
                            external_id: child.external_id,
                            data,
                        })
                    }
                }
                return a
            }, []),
            stats: step.stats,
            stats_at: step.stats_at,
        }
    }

    return editData
}
