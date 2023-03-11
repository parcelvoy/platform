import Project from '../../projects/Project'
import { User } from '../../users/User'
import Journey from '../Journey'
import { lastJourneyStep, setJourneyStepMap } from '../JourneyRepository'
import JourneyService from '../JourneyService'

describe('Run', () => {
    describe('step progression', () => {
        test('user should be taken to action 2 or 3', async () => {

            const project = await Project.insertAndFetch({
                name: `Test Project ${Date.now()}`,
            })

            const journey = await Journey.insertAndFetch({
                project_id: project.id,
                name: `Test Journey ${Date.now()}`,
            })

            const baseStep = {
                x: 0,
                y: 0,
            }

            // entrance -> gate -> (action1 | experiment -> (action2 | action3))
            const { steps } = await setJourneyStepMap(journey.id, {
                entrance: {
                    ...baseStep,
                    type: 'entrance',
                    children: [
                        {
                            external_id: 'gate',
                        },
                    ],
                },
                gate: {
                    ...baseStep,
                    type: 'gate',
                    data: {
                        rule: {
                            type: 'string',
                            group: 'user',
                            path: '$.email',
                            operator: '=',
                            value: 'test1@twochris.com',
                        },
                    },
                    children: [
                        // if passed
                        {
                            external_id: 'action1',
                        },
                        // if failed
                        {
                            external_id: 'experiment',
                        },
                    ],
                },
                experiment: {
                    ...baseStep,
                    type: 'experiment',
                    children: [
                        {
                            external_id: 'action2',
                            data: {
                                ratio: 1,
                            },
                        },
                        {
                            external_id: 'action3',
                            data: {
                                ratio: 1,
                            },
                        },
                    ],
                },
                action1: {
                    ...baseStep,
                    type: 'action',
                    data: {
                        campaign_id: 0,
                    },
                },
                action2: {
                    ...baseStep,
                    type: 'action',
                    data: {
                        campaign_id: 0,
                    },
                },
                action3: {
                    ...baseStep,
                    type: 'action',
                    data: {
                        campaign_id: 0,
                    },
                },
            })

            const service = new JourneyService(journey.id)

            const user = await User.insertAndFetch({
                project_id: project.id,
                external_id: '1',
                email: 'test2@twochris.com', // won't match the gate condition
                data: {},
            })

            await service.run(user)

            const actionIds = steps
                .filter(s => s.external_id === 'action2' || s.external_id === 'action3')
                .map(s => s.id)
            const lastStep = await lastJourneyStep(user.id, journey.id)
            expect(actionIds).toContain(lastStep?.step_id)
        })
    })
})
