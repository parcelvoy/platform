import { add, isFuture } from 'date-fns'
import Model from '../core/Model'
import { User } from '../users/User'
import Rule from '../rules/Rule'
import { check } from '../rules/RuleEngine'
import { getJourneyStep, getUserJourneyStep } from './JourneyRepository'
import { UserEvent } from '../users/UserEvent'
import { getCampaign, sendCampaign } from '../campaigns/CampaignService'
import { pascalToSnakeCase } from '../utilities'

export class JourneyUserStep extends Model {
    user_id!: number
    type!: string
    journey_id!: number
    step_id!: number

    static tableName = 'journey_user_step'
}

export class JourneyStep extends Model {
    type!: string
    journey_id!: number
    child_id?: number // the step that comes after
    data?: Record<string, unknown>

    // UI variables
    x = 0
    y = 0

    static tableName = 'journey_steps'
    static jsonAttributes = ['data']

    static get type() { return pascalToSnakeCase(this.name) }

    async step(user: User, type: string) {
        await JourneyUserStep.insert({
            type,
            user_id: user.id,
            journey_id: this.journey_id,
            step_id: this.id,
        })
    }

    async complete(user: User) {
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
        return await getJourneyStep(this.child_id)
    }
}

export type JourneyStepParams = Pick<JourneyStep, 'type' | 'child_id' | 'data' | 'x' | 'y'>

export class JourneyEntrance extends JourneyStep {
    static type = 'entrance'

    list_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.list_id = json?.data.list_id
    }

    static async create(listId: number, childId?: number, journeyId?: number): Promise<JourneyEntrance> {
        return await JourneyEntrance.insertAndFetch({
            type: this.type,
            child_id: childId,
            journey_id: journeyId,
            data: {
                list_id: listId,
            },
        })
    }
}

export class JourneyDelay extends JourneyStep {
    static type = 'delay'

    seconds = 0
    minutes = 0
    hours = 0
    days = 0

    parseJson(json: any) {
        super.parseJson(json)

        this.seconds = json?.data?.seconds
        this.minutes = json?.data?.minutes
        this.hours = json?.data?.hours
        this.days = json?.data?.days
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
        if (isFuture(this.offset(userJourneyStep.created_at))) return false
        return true
    }

    private offset(date: Date): Date {
        return add(date, {
            days: this.days,
            hours: this.hours,
            minutes: this.minutes,
            seconds: this.seconds,
        })
    }
}

export class JourneyAction extends JourneyStep {
    static type = 'action'

    campaign_id!: number

    parseJson(json: any) {
        super.parseJson(json)
        this.campaign_id = json?.data?.campaign_id
    }

    async next(user: User, event?: UserEvent) {

        const campaign = await getCampaign(this.campaign_id, user.project_id)
        if (campaign) {
            await sendCampaign(campaign, user, event)
        }

        return super.next(user, event)
    }
}

// Look at a condition tree and evaluate if user passes on to next step
export class JourneyGate extends JourneyStep {
    static type = 'gate'

    entrance_type!: 'user' | 'event'
    rule!: Rule

    parseJson(json: any) {
        super.parseJson(json)

        this.entrance_type = json?.data?.entrance_type
        this.rule = json?.data.rule
    }

    static async create(entranceType: string, rule: Rule, childId?: number, journeyId?: number): Promise<JourneyGate> {
        return await JourneyGate.insertAndFetch({
            type: this.type,
            child_id: childId,
            journey_id: journeyId,
            data: {
                entrance_type: entranceType,
                rule,
            },
        })
    }

    async condition(user: User, event?: UserEvent): Promise<boolean> {
        return check({
            user: user.flatten(),
            event: event?.flatten(),
        }, [this.rule])
    }
}

type MapOptions = Record<string, number>

export class JourneyMap extends JourneyStep {
    static type = 'map'

    attribute!: string
    options!: MapOptions

    parseJson(json: any) {
        super.parseJson(json)

        this.attribute = json?.data?.attribute
        this.options = json?.data.options
    }

    static async create(attribute: string, options: MapOptions, journeyId?: number): Promise<JourneyMap> {
        return await JourneyMap.insertAndFetch({
            type: this.type,
            journey_id: journeyId,
            data: {
                attribute,
                options,
            },
        })
    }

    async condition(): Promise<boolean> {
        return true
    }

    async next(user: User) {

        // When comparing the user expects comparison
        // to be between the UI model user vs core user
        const templateUser = user.flatten()

        // Based on an attribute match, pick a child step
        const value = templateUser[this.attribute]
        const childId = this.options[value]
        return await getJourneyStep(childId)
    }
}
