import { add, isFuture } from 'date-fns'
import Model from '../models/Model'
import { User } from '../models/User'
import Rule from '../rules/Rule'
import { check } from '../rules/RuleEngine'
import { getJourneyStep, getUserJourneyStep } from './JourneyRepository'
import { UserEvent } from './UserEvent'
import EmailJob from '../jobs/EmailJob'
import App from '../app'
import TextJob from '../jobs/TextJob'
import WebhookJob from '../jobs/WebhookJob'

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
    data: any

    static tableName = 'journey_steps'
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

// type Operator = '=' | '!=' | 'is set'
// interface Rule {
//     attribute: string
//     operator: Operator
//     value?: unknown
//     arrayOperator?: Operator
// }

// type NumberOperator = '<' |'<=' | '>' | '>=' | '=' | 'is set' | 'is not set'
// interface NumberRule {

// }

/*
{
    "type": "operator",
    "operator": "and",
    "children": [
        {
            "type": "string",
            "path": "$.email",
            "startsWith": "chris"
        },
        {
            "type": "number",
            "path": "$.count",
            "operator": ">",
            "value": "2"
        }
    ]
}

{
    email: "chris@twochris.io",
    count: 2
}
*/

// string: is, is not, contains, does not contain, is set, is not set
// number: =, !=, >, >=, <, <=, is set, is not set
// boolean: true, false
// date: ??
// list: any, all

// [
//     {
//         type: 'wrapper',
//         operator: 'or',
//         children: [ // could potentially name this `value` to keep with structure
//             {
//                 type: 'string',
//                 path: '$.email',
//                 operator: '=',
//                 value: 'email@email.com'
//             },
//             {
//                 type: 'array',
//                 path: '$.devices.*',
//                 operator: ''
//             }
//         ]
//     }, // anything not in an `or` wrapper is an `and` by default
//     {
//         type: 'number',
//         path: '$.highScore',
//         operator: '<',
//         value: '20'
//     }
// ]

export class JourneyEntrance extends JourneyStep {

    rules: Rule[] = []

    parseJson(json: any) {
        super.parseJson(json)

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

    async condition(user: User, event?: UserEvent): Promise<boolean> {
        return check({
            user: user.flatten(),
            event: event?.flatten(),
        }, this.rules)
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

type ChannelType = 'text' | 'email' | 'webhook'
export class JourneyAction extends JourneyStep {

    channel!: ChannelType
    template_id!: number

    parseJson(json: any) {
        super.parseJson(json)

        this.channel = json?.data?.type
        this.template_id = json?.data?.template_id
    }

    async next(user: User, event?: UserEvent) {
        const channels = {
            email: EmailJob.from({
                template_id: this.template_id,
                user_id: user.id,
                event_id: event?.id,
            }),
            text: TextJob.from({
                template_id: this.template_id,
                user_id: user.id,
                event_id: event?.id,
            }),
            webhook: WebhookJob.from({
                template_id: this.template_id,
                user_id: user.id,
                event_id: event?.id,
            }),
        }
        App.main.queue.enqueue(channels[this.channel])

        return super.next(user, event)
    }
}

// Look at a condition tree and evaluate if user passes on to next step
export class JourneyGate extends JourneyStep {
    entrance_type!: 'user' | 'event'
    rule!: Rule

    parseJson(json: any) {
        super.parseJson(json)

        this.entrance_type = json?.data?.entrance_type
        this.rule = json?.data.rule
    }

    static async create(entranceType: string, rules: Rule[], childId?: number, journeyId?: number): Promise<JourneyGate> {
        return await JourneyGate.insertAndFetch({
            type: this.name,
            child_id: childId,
            journey_id: journeyId,
            data: {
                entrance_type: entranceType,
                rules,
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
    attribute!: string
    options!: MapOptions

    parseJson(json: any) {
        super.parseJson(json)

        this.attribute = json?.data?.attribute
        this.options = json?.data.options
    }

    static async create(attribute: string, options: MapOptions, journeyId?: number): Promise<JourneyMap> {
        return await JourneyMap.insertAndFetch({
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
