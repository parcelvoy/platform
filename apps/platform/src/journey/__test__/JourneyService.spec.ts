import List from '../../lists/List'
import Project from '../../projects/Project'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import Journey from '../Journey'
import { lastJourneyStep, setJourneyStepMap } from '../JourneyRepository'
import JourneyService, { enterJourneyFromList } from '../JourneyService'
import { JourneyEntrance, JourneyUpdate } from '../JourneyStep'

describe('Run', () => {
    describe('step progression', () => {

        const baseStep = {
            x: 0,
            y: 0,
            data: {},
        }

        const setup = async () => {
            const project = await Project.insertAndFetch({
                name: `Test Project ${Date.now()}`,
            })
            const journey = await Journey.insertAndFetch({
                project_id: project.id,
                name: `Test Journey ${Date.now()}`,
            })
            return { project, journey }
        }

        test('user should be taken to action 2 or 3', async () => {

            const { project, journey } = await setup()

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

        test('user update step adds data to profile', async () => {

            const { project, journey } = await setup()

            const { steps } = await setJourneyStepMap(journey.id, {
                entrance: {
                    ...baseStep,
                    type: JourneyEntrance.type,
                    children: [
                        {
                            external_id: 'update',
                        },
                    ],
                },
                update: {
                    ...baseStep,
                    type: JourneyUpdate.type,
                    data: {
                        template: `
                            {
                                "field2": 2,
                                "fromUser": {
                                    "prevField2": "{{user.field2}}"
                                },
                                "fromEvent": "{{event.name}}"
                            }
                        `,
                    },
                },
            })

            const user = await User.insertAndFetch({
                project_id: project.id,
                external_id: '2',
                email: 'test3@twochris.com',
                data: {
                    field1: 1,
                    field2: 'two',
                },
            })

            const event = await UserEvent.insertAndFetch({
                project_id: project.id,
                user_id: user.id,
                name: 'signin',
                data: {
                    project: 'Parcelvoy',
                },
            })

            const service = new JourneyService(journey.id)

            await service.run(user, event)

            const updateStep = steps.find(s => s.external_id === 'update')!
            const lastStep = await lastJourneyStep(user.id, journey.id)
            expect(updateStep).toBeDefined()
            expect(lastStep?.step_id).toBe(updateStep.id)
            expect(user.data.field1).toBe(1)
            expect(user.data.field2).toBe(2)
            expect(user.data.fromUser.prevField2).toBe('two')
            expect(user.data.fromEvent).toEqual('signin')
        })

        test('user should only be added to a multi-entrance journey once', async () => {

            const { project, journey } = await setup()

            const list1 = await List.insertAndFetch({
                project_id: project.id,
                name: 'Multi-entrance Journey List 1',
                type: 'static',
            })

            const list2 = await List.insertAndFetch({
                project_id: project.id,
                name: 'Multi-entrance Journey List 2',
                type: 'static',
            })

            const { steps } = await setJourneyStepMap(journey.id, {
                entrance1: {
                    ...baseStep,
                    type: 'entrance',
                    data: {
                        list_id: list1.id,
                    },
                    children: [
                        {
                            external_id: 'gate1',
                        },
                    ],
                },
                entrance2: {
                    ...baseStep,
                    type: 'entrance',
                    data: {
                        list_id: list2.id,
                    },
                    children: [
                        {
                            external_id: 'gate2',
                        },
                    ],
                },
                gate1: {
                    ...baseStep,
                    type: 'gate',
                },
                gate2: {
                    ...baseStep,
                    type: 'gate',
                },
            })

            const user = await User.insertAndFetch({
                project_id: project.id,
                external_id: '1',
                data: {},
            })

            // add user to journey entrance 1 via list 1
            await enterJourneyFromList(list1, user)
            const gateStep = steps.find(s => s.external_id === 'gate1')
            let lastStep = await lastJourneyStep(user.id, journey.id)
            expect(gateStep).toBeDefined()
            expect(lastStep).toBeDefined()
            expect(lastStep!.step_id).toEqual(gateStep!.id)

            // when processed again via list 2, user state should remain unchanged
            await enterJourneyFromList(list2, user)
            lastStep = await lastJourneyStep(user.id, journey.id)
            expect(lastStep).toBeDefined()
            expect(lastStep!.step_id).toEqual(gateStep!.id)
        })
    })
})
