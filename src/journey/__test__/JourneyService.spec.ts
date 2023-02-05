import List from '../../lists/List'
import Project from '../../projects/Project'
import { User } from '../../users/User'
import Journey from '../Journey'
import { lastJourneyStep } from '../JourneyRepository'
import JourneyService from '../JourneyService'
import { JourneyEntrance, JourneyMap, JourneyStepChild } from '../JourneyStep'

describe('Run', () => {
    describe('step progression', () => {
        test('an entrance will proceed to map', async () => {

            const project = await Project.insertAndFetch()
            const journey = await Journey.insertAndFetch({ project_id: project.id })
            const list = await List.insertAndFetch({
                project_id: project.id,
                rule: {
                    type: 'string',
                    group: 'user',
                    path: '$.language',
                    operator: '=',
                    value: 'en',
                },
            })
            const step2 = await JourneyMap.create('country', {
                US: 43,
                ES: 34,
            }, journey.id)
            const entrance = await JourneyEntrance.create(journey.id, list.id)
            await JourneyStepChild.insertAndFetch({
                step_id: entrance.id,
                child_id: step2.id,
                data: {},
            })

            const service = new JourneyService(journey.id)

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
