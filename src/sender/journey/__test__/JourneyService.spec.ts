import { Project } from '../../../models/Project'
import { User } from '../../../models/User'
import Journey from '../Journey'
import { lastJourneyStep } from '../JourneyRepository'
import JourneyService from '../JourneyService'
import { JourneyEntrance, JourneyMap, JourneyUserStep } from '../JourneyStep'

describe('Run', () => {
    describe('step progression', () => {
        test('an entrance will proceed to map', async () => {

            const journey = await Journey.insertAndFetch()
            const step2 = await JourneyMap.create('country', {
                US: 43,
                ES: 34,
            }, journey.id)
            await JourneyEntrance.create('user', [{
                type: 'string',
                path: '$.language',
                operator: '=',
                value: 'en',
            }], step2.id, journey.id)

            const service = new JourneyService(journey.id)

            const project = await Project.insertAndFetch()
            const user = await User.insertAndFetch({
                email: 'test@test.com',
                project_id: project.id,
                external_id: 'abcd',
                data: {
                    language: 'en',
                    country: 'US',
                },
            })

            await service.run(user)

            const lastStep = await lastJourneyStep(user.id, journey.id)
            expect(lastStep?.step_id).toEqual(step2.id)
        })
    })
})
