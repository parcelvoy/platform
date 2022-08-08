import { add, isFuture } from 'date-fns'
import Model from '../../models/Model'
import { User } from '../../models/User'
import { getJourneyStep, getUserJourneyStep } from './JourneyRepository'

export class JourneyUserStep extends Model {
    user_id!: number
    type!: string
    journey_id!: number
    step_id!: number
    created_at!: Date
}

export class JourneyStep extends Model {
    type!: string
    journey_id!: number
    child_id?: number // the step that comes after
    data: any

    static tableName = 'journey_step'
    get $name(): string { return this.constructor.name }

    async step(user: User, type: string) {
        await JourneyUserStep.insert({
            type,
            user_id: user.id,
            journey_id: this.journey_id,
            step_id: this.id,
        })
    }

    async complete(user: User) {
        this.step(user, 'completed')
    }

    async hasCompleted(user: User): Promise<boolean> {
        const userJourneyStep = await getUserJourneyStep(user.id, this.id)
        return !!userJourneyStep
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async condition(user: User, event?: Event): Promise<boolean> {
        return !(await this.hasCompleted(user))
    }

    /**
     * Get the next job if one exists
     * If no next step, end the cycle
     * @returns JourneyStep if one is available
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async next(user: User, event?: Event): Promise<JourneyStep | undefined> {
        return await getJourneyStep(this.child_id)
    }
}

type Operator = '=' | '!=' | 'is set'
interface Rule {
    attribute: string
    operator: Operator
    value?: string
}

type Conditional = (a: any, b?: any) => boolean

export class JourneyEntrance extends JourneyStep {

    entrance_type!: 'user' | 'event'
    rules: Rule[] = []

    parseJson(json: any) {
        super.parseJson(json)

        this.entrance_type = json?.data?.entrance_type
        this.rules = json?.data.rules
    }

    static async create(entranceType: string, rules: Rule[], childId?: number, journeyId?: number): Promise<JourneyEntrance> {
        return await JourneyEntrance.insertAndFetch({
            type: this.name,
            child_id: childId,
            journey_id: journeyId,
            data: {
                entrance_type: entranceType,
                rules,
            },
        })
    }

    async condition(user: User, event?: Event): Promise<boolean> {

        // Based on entrance type get flattened user or event
        const obj = this.entrance_type === 'user' ? user.flatten() : event

        // If entrance is event based and we don't have an event, break
        if (!obj) return false

        // Check that all rules are met
        return this.rules.every(rule => this.checkRule(obj, rule))
    }

    private checkRule(obj: { [key: string]: any }, rule: Rule): boolean {
        const conditionals: { [key: string]: Conditional } = {
            '=': (a, b) => a === b,
            '!=': (a, b) => a !== b,
            'is set': (a) => a != null,
        }
        return conditionals[rule.operator](obj[rule.attribute], rule.value)
    }
}

export class JourneyDelay extends JourneyStep {
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

}

type JourneyMap = Record<string, number>

export class JourneyGate extends JourneyStep {
    attribute!: string
    options!: JourneyMap

    parseJson(json: any) {
        super.parseJson(json)

        this.attribute = json?.data?.attribute
        this.options = json?.data.options
    }

    static async create(attribute: string, options: JourneyMap, journeyId?: number): Promise<JourneyGate> {
        return await JourneyGate.insertAndFetch({
            type: this.name,
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
