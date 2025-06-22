import Model from '../core/Model'
import { type JourneyStep } from './JourneyStep'

export default class JourneyUserStep extends Model {
    user_id!: number
    type!: string
    journey_id!: number
    step_id!: number
    delay_until?: Date
    entrance_id?: number
    ended_at?: Date
    data?: Record<string, unknown> | null
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
