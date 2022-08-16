import { User } from '../../../models/User'
import { JourneyStep, JourneyEntrance, JourneyGate, JourneyMap } from '../JourneyStep'

describe('JourneyEntrance', () => {
    describe('user entrance', () => {
        test('condition passes with valid equals rule', async () => {

            const email = 'test@test.com'
            const user = User.fromJson({ email })
            const entrance = await JourneyEntrance.create('user', [{
                type: 'string',
                path: '$.email',
                operator: '=',
                value: email,
            }])
            const value = await entrance.condition(user)

            expect(value).toBeTruthy()
        })

        test('condition fails with incorrect equals rule', async () => {

            const email = 'test@test.com'
            const user = User.fromJson({ email })
            const entrance = await JourneyEntrance.create('user', [{
                type: 'string',
                path: '$.email',
                operator: '=',
                value: 'notequal@test.com',
            }])
            const value = await entrance.condition(user)

            expect(value).toBeFalsy()
        })

        test('condition passes with valid not equals rule', async () => {

            const email = 'test@test.com'
            const user = User.fromJson({ email })
            const entrance = await JourneyEntrance.create('user', [{
                type: 'string',
                path: '$.email',
                operator: '!=',
                value: 'notequal@test.com',
            }])
            const value = await entrance.condition(user)

            expect(value).toBeTruthy()
        })

        test('condition passes with valid is set rule', async () => {

            const email = 'test@test.com'
            const user = User.fromJson({ email })
            const entrance = await JourneyEntrance.create('user', [{
                type: 'string',
                path: '$.email',
                operator: 'is set',
            }])
            const value = await entrance.condition(user)

            expect(value).toBeTruthy()
        })
    })
})

describe('Journey Map', () => {
    test('different options pick different paths', async () => {

        const user = User.fromJson({ data: { progress: '20' } })
        const step1 = await JourneyStep.insertAndFetch()
        const step2 = await JourneyStep.insertAndFetch()
        const step3 = await JourneyStep.insertAndFetch()

        const map = await JourneyMap.create('progress', {
            10: step1.id,
            20: step2.id,
            30: step3.id,
        })
        const value1 = await map.next(user)
        expect(value1?.id).toEqual(step2.id)

        user.data.progress = '30'
        const value2 = await map.next(user)
        expect(value2?.id).toEqual(step3.id)
    })
})
