import { add, isBefore, isFuture } from 'date-fns'
import Model from '../core/Model'
import { User } from '../users/User'
import { getJourneyStep, getJourneyStepChildren, getUserJourneyStep } from './JourneyRepository'
import { UserEvent } from '../users/UserEvent'
import { getCampaign, sendCampaign } from '../campaigns/CampaignService'
import { random, snakeCase, uuid } from '../utilities'
import App from '../app'
import JourneyProcessJob from './JourneyProcessJob'
import { Database } from '../config/database'
import { compileTemplate } from '../render'
import { logger } from '../config/logger'
import { getProject } from '../projects/ProjectService'
import { getTimezoneOffset } from 'date-fns-tz'
import { isUserInList } from '../lists/ListService'

export class JourneyUserStep extends Model {
    user_id!: number
    type!: string
    journey_id!: number
    step_id!: number

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

    async step(user: User, type: string) {
        await JourneyUserStep.insert({
            type,
            user_id: user.id,
            journey_id: this.journey_id,
            step_id: this.id,
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async complete(user: User, event?: UserEvent) {
        await this.step(user, 'completed')
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

export class JourneyDelay extends JourneyStep {
    static type = 'delay'

    minutes = 0
    hours = 0
    days = 0
    time?: string

    parseJson(json: any) {
        super.parseJson(json)

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
            await this.step(user, 'delay')
            return false
        }

        // If event, check that it's in the past
        if (isFuture(await this.offset(userJourneyStep.created_at, user))) return false
        return true
    }

    private async offset(date: Date, user: User): Promise<Date> {

        let nextDate = add(date, {
            days: this.days,
            hours: this.hours,
            minutes: this.minutes,
        })

        const time = this.time?.trim() // hh:mm
        if (time?.length === 5) {
            const [hours, minutes] = time.split(':').map(s => parseInt(s, 10))
            if (!isNaN(hours) && !isNaN(minutes)) {
                let tz = user.timezone
                if (!tz) {
                    const project = await getProject(user.project_id)
                    tz = project!.timezone
                }
                if (tz) {
                    const offset = getTimezoneOffset(tz, nextDate)
                    nextDate = add(nextDate, { hours: offset })
                }
                nextDate.setHours(hours)
                nextDate.setMinutes(minutes)
                // if resulting time is before the visit date, push out to next day same time
                if (isBefore(nextDate, date)) {
                    nextDate = add(nextDate, { days: 1 })
                }
            }
        }

        return nextDate
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
            await sendCampaign({ campaign, user, event })
        }

        await super.complete(user, event)
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

    async complete(user: User, event?: UserEvent | undefined): Promise<void> {

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

    async complete(user: User, event?: UserEvent | undefined): Promise<void> {

        if (this.template.trim()) {
            let value: any
            try {
                value = JSON.parse(compileTemplate(this.template)({
                    user: user.flatten(),
                    event: event?.flatten(),
                }))
            } catch (err: any) {
                logger.warn({
                    error: err.message,
                }, 'Error while updating user')
                return
            }
            if (typeof value === 'object') {
                user.data = {
                    ...user.data,
                    ...value,
                }
                await User.update(q => q.where('id', user.id), {
                    data: user.data,
                })
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
