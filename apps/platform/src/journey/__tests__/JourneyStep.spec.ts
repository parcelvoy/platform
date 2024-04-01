import addMinutes from 'date-fns/addMinutes'
import { JourneyDelay, JourneyUserStep } from '../JourneyStep'
import { setupTestJourney } from './helpers'
import { JourneyState } from '../JourneyState'

describe('JourneyStep', () => {
    describe('Delay', () => {
        test('duration delay of 2 minute', async () => {
            const { journey, user } = await setupTestJourney({ data: {}, stepMap: {} })

            const delay = new JourneyDelay()
            delay.minutes = 1
            delay.format = 'duration'

            const step = JourneyUserStep.fromJson({
                journey_id: journey.id,
                entrance_id: 0,
                user_id: user.id,
                type: 'pending',
            })
            const state = new JourneyState({} as any, [], [], [], user)
            await delay.process(state, step)

            expect(step.type).toEqual('delay')
            expect(step.delay_until).not.toBeNull()
            expect(step.delay_until?.getTime()).toBeGreaterThan(Date.now())
        })

        test('handlebars renders properly', async () => {
            const { journey, user } = await setupTestJourney({ data: {}, stepMap: {} })

            const delay = new JourneyDelay()
            delay.date = '{{ addDate "now" 1 "hour" }}'
            delay.format = 'date'

            const step = JourneyUserStep.fromJson({
                journey_id: journey.id,
                entrance_id: 0,
                user_id: user.id,
                type: 'pending',
            })
            const state = new JourneyState({} as any, [], [], [], user)
            await delay.process(state, step)

            const referenceDate = addMinutes(new Date(), 59)

            expect(step.type).toEqual('delay')
            expect(step.delay_until).not.toBeNull()
            expect(step.delay_until?.getTime()).toBeGreaterThan(referenceDate.getTime())
        })
    })
})
