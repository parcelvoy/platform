import { add, isFuture, isPast, parse } from 'date-fns'
import Model from '../core/Model'
import { User } from '../users/User'
import { getJourneyStep, getJourneyStepChildren, getUserJourneyStep } from './JourneyRepository'
import { UserEvent } from '../users/UserEvent'
import { getCampaign, getCampaignSend, sendCampaign } from '../campaigns/CampaignService'
import { crossTimezoneCopy, random, snakeCase, uuid } from '../utilities'
import App from '../app'
import JourneyProcessJob from './JourneyProcessJob'
import { Database } from '../config/database'
import { compileTemplate } from '../render'
import { logger } from '../config/logger'
import { getProject } from '../projects/ProjectService'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { isUserInList } from '../lists/ListService'

export class JourneyUserStep extends Model {
    user_id!: number
    type!: string
    journey_id!: number
    step_id!: number
    delay_until?: Date

    static tableName = 'journey_user_step'
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

    // UI variables
    x = 0
    y = 0

    static tableName = 'journey_steps'
    static jsonAttributes = ['data']

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async getStats(steps: JourneyStep[]): Promise<{ [external_id: string]: any }> {
        return {}
    }

    static get type() { return snakeCase(this.name) }

    async step(user: User, type: string, delay_until?: Date) {
        return await JourneyUserStep.insert({
            type,
            user_id: user.id,
            journey_id: this.journey_id,
            step_id: this.id,
            delay_until,
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async complete(user: User, event?: UserEvent) {
        await this.step(user, 'completed')
        return true
    }

    async hasCompleted(user: User): Promise<boolean> {
        const userJourneyStep = await getUserJourneyStep(user.id, this.id)
        return !!userJourneyStep
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async condition(user: User, event?: UserEvent): Promise<boolean> {
        return !(await this.hasCompleted(user))
    }

    /**
     * Get the next job if one exists
     * If no next step, end the cycle
     * @returns JourneyStep if one is available
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async next(user: User, event?: UserEvent): Promise<JourneyStep | undefined> {
        const child = await JourneyStepChild.first(q => q.where('step_id', this.id))
        if (!child) return undefined
        return await getJourneyStep(child.child_id)
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

    async condition(user: User): Promise<boolean> {

        // Check for delay event
        const userJourneyStep = await getUserJourneyStep(user.id, this.id, 'delay')

        // If no delay yet, event hasn't been seen yet, create and break
        if (!userJourneyStep) {

            // determine user/project timezone
            const timezone = await this.timezone(user)

            // compute delay (in UTC)
            const delayUntil = await this.offset(new Date(), timezone)

            // record delay
            await this.step(user, 'delay', delayUntil)

            // do not continue, wait for JourneyDelayJob to pick this up again
            return false
        }

        return !userJourneyStep.delay_until || !isFuture(userJourneyStep.delay_until)
    }

    private async offset(baseDate: Date, timezone: string): Promise<Date> {

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

    private async timezone(user: User) {
        const tz = user.timezone
        if (tz) return tz
        const project = await getProject(user.project_id)
        return project!.timezone
    }
}

export class JourneyAction extends JourneyStep {
    static type = 'action'

    campaign_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.campaign_id = json?.data?.campaign_id
    }

    async complete(user: User, event?: UserEvent) {
        const campaign = await getCampaign(this.campaign_id, user.project_id)

        if (campaign) {

            // check if we have already recorded this action
            const wait = await getUserJourneyStep(user.id, this.id, 'action')

            if (wait) {
                const send = await getCampaignSend(campaign.id, user.id, wait.id)
                if (send?.state === 'sent') {
                    // carry on, this was recorded as sent
                    return await super.complete(user, event)
                }
                // not sent yet, don't continue
                return false
            } else {
                // not triggered yet, mark that we've visited this step
                // and pass a reference to this campaign
                const user_step_id = await this.step(user, 'action')
                await sendCampaign({
                    campaign,
                    user,
                    event,
                    user_step_id,
                })
                return false
            }
        }

        return await super.complete(user, event)
    }
}

export class JourneyGate extends JourneyStep {
    static type = 'gate'

    list_id?: number

    parseJson(json: any) {
        super.parseJson(json)
        this.list_id = json?.data?.list_id
    }

    async next(user: User) {
        const [passed, failed] = await getJourneyStepChildren(this.id)
        if (!this.list_id) return await getJourneyStep(passed?.child_id)

        const isInList = await isUserInList(user.id, this.list_id)
        if (isInList) {
            return await getJourneyStep(passed?.child_id)
        }
        return await getJourneyStep(failed?.child_id)
    }
}

/**
 * randomly distribute users to different branches
 */
export class JourneyExperiment extends JourneyStep {
    static type = 'experiment'

    async next() {

        let children = await getJourneyStepChildren(this.id)

        if (!children.length) return undefined

        children = children.reduce<JourneyStepChild[]>((a, c) => {
            const proportion = Number(c.data?.ratio)
            if (!isNaN(proportion) && proportion > 0) {
                for (let i = 0; i < proportion; i++) {
                    a.push(c)
                }
            }
            return a
        }, [])

        if (!children.length) return undefined

        return await getJourneyStep(random(children).child_id)
    }

}

/**
 * add user to another journey
 */
export class JourneyLink extends JourneyStep {
    static type = 'link'

    target_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.target_id = json.data?.journey_id
    }

    async complete(user: User, event?: UserEvent | undefined) {

        if (!isNaN(this.journey_id)) {
            await App.main.queue.enqueue(JourneyProcessJob.from({
                journey_id: this.target_id,
                user_id: user.id,
                event_id: event?.id,
            }))
        }

        return super.complete(user, event)
    }
}

export class JourneyUpdate extends JourneyStep {
    static type = 'update'

    template!: string

    parseJson(json: any) {
        super.parseJson(json)
        this.template = json.data?.template
    }

    async complete(user: User, event?: UserEvent | undefined) {

        if (this.template.trim()) {
            let value: any
            try {
                value = JSON.parse(compileTemplate(this.template)({
                    user: user.flatten(),
                    event: event?.flatten(),
                }))
                if (typeof value === 'object') {
                    user.data = {
                        ...user.data,
                        ...value,
                    }
                    await User.update(q => q.where('id', user.id), {
                        data: user.data,
                    })
                }
            } catch (err: any) {
                logger.warn({
                    error: err.message,
                }, 'Error while updating user')
                this.step(user, 'error')
                return false
            }
        }

        return super.complete(user, event)
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
        x: number
        y: number
        children?: Array<{
            external_id: string
            data?: Record<string, unknown>
        }>
    }
>

// This is async in case we ever want to fetch stats here
export async function toJourneyStepMap(steps: JourneyStep[], children: JourneyStepChild[]) {
    const editData: JourneyStepMap = {}

    for (const step of steps) {
        editData[step.external_id] = {
            type: step.type,
            data: step.data ?? {},
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
        }
    }

    return editData
}
