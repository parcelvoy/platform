// import List from '../../lists/List'
// import Project from '../../projects/Project'
// import { User } from '../../users/User'
// import { UserEvent } from '../../users/UserEvent'
// import Journey from '../Journey'
// import { lastJourneyStep, setJourneyStepMap } from '../JourneyRepository'
// import JourneyService, { enterJourneyFromList } from '../JourneyService'
// import { JourneyEntrance, JourneyUpdate, JourneyUserStep } from '../JourneyStep'

import List, { UserList } from '../../lists/List'
import Organization from '../../organizations/Organization'
import Project from '../../projects/Project'
import Rule from '../../rules/Rule'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { uuid } from '../../utilities'
import Journey from '../Journey'
import { getUserActiveEntrances } from '../JourneyRepository'
import { JourneyState, enterJourneysFromList } from '../JourneyService'
import { JourneyStep, JourneyStepMap, JourneyUserStep } from '../JourneyStep'

describe('JourneyService', () => {

    const baseStep = {
        x: 0,
        y: 0,
        data: {},
    }

    const setup = async () => {
        const org = (await Organization.find(1))!
        const project = await Project.insertAndFetch({
            organization_id: org.id,
            name: `Project ${Date.now()}`,
        })
        return { org, project }
    }

    const entrance = (list_id: number, childId: string) => {
        return {
            ...baseStep,
            type: 'entrance',
            data: {
                list_id,
            },
            children: [
                {
                    external_id: childId,
                },
            ],
        }
    }

    const gate = (rule: Rule, childIds: string[]) => {
        return {
            ...baseStep,
            type: 'gate',
            data: {
                rule,
            },
            children: childIds.map(external_id => ({ external_id })),
        }
    }

    const delay = (hours: number, childId: string) => {
        return {
            ...baseStep,
            type: 'delay',
            data: {
                format: 'duration',
                hours,
            },
            children: [
                {
                    external_id: childId,
                },
            ],
        }
    }

    interface SetupJourneyParams {
        data: Record<string, unknown>
        events?: Array<{
            name: string
            data: Record<string, unknown>
        }>
        stepMap: JourneyStepMap
    }

    const setupJourney = async ({ data, events, stepMap }: SetupJourneyParams) => {

        const { project } = await setup()

        const { journey, steps } = await Journey.create(project.id, 'Test Journey', stepMap)

        const user = await User.insertAndFetch({
            project_id: project.id,
            external_id: Date.now().toString(),
            data,
        })

        if (events?.length) {
            await UserEvent.insert(events.map(({ name, data }) => ({
                project_id: project.id,
                user_id: user.id,
                name,
                data,
            })))
        }

        return { journey, project, steps, user }
    }

    const expectStepPath = (state: JourneyState, expectedPath: string[]) => {
        const resultPath = state.userSteps.map(us => state.steps.find(s => us.step_id === s.id)?.external_id ?? '??').join('->')
        expect(resultPath).toEqual(expectedPath.join('->'))
    }

    const enterAtStep = async (user: User, steps: JourneyStep[], external_id: string) => {
        const step = steps.find(s => s.external_id === external_id)!
        return await JourneyUserStep.insertAndFetch({
            journey_id: step.journey_id,
            step_id: step.id,
            user_id: user.id,
            type: 'completed',
        })
    }

    test('Entrance - Single User', async () => {

        const { project } = await setup()

        const list = await List.insertAndFetch({
            project_id: project.id,
            name: 'list',
        })

        const user = await User.insertAndFetch({
            project_id: project.id,
            external_id: uuid(),
        })

        await UserList.insert({
            user_id: user.id,
            list_id: list.id,
        })

        // user should get added to this one
        const journey1 = await Journey.create(project.id, 'Journey 1', {
            e1: entrance(list.id, ''),
        })

        // user should NOT get added to this one
        const journey2 = await Journey.create(project.id, 'Journey 2', {
            e1: entrance(0, ''),
        })

        // user should only enter this journey once, at the first entrance step
        const journey3 = await Journey.create(project.id, 'Journey 3', {
            e1: entrance(list.id, ''),
            e2: entrance(list.id, ''),
        })

        // user should have entered at these two steps
        const j1 = journey1.steps.find(s => s.external_id === 'e1')!
        const j2 = journey2.steps.find(s => s.external_id === 'e1')!
        const j3 = journey3.steps.find(s => s.external_id === 'e1')!
        const j4 = journey3.steps.find(s => s.external_id === 'e2')!

        await enterJourneysFromList(list, user)

        const entranceStepIds = await getUserActiveEntrances(user.id).then(x => x.map(e => e.step_id))

        expect(entranceStepIds.length).toBe(2)
        expect(entranceStepIds).toContain(j1.id)
        expect(entranceStepIds).not.toContain(j2.id)
        expect(entranceStepIds).toContain(j3.id)
        expect(entranceStepIds).not.toContain(j4.id)

    })

    test('Entrance - List', async () => {

        // TODO
        expect(0).toBe(0)
    })

    test('Steps - Delay', async () => {

        const { steps, user } = await setupJourney({
            data: {},
            stepMap: {
                e: entrance(0, 'd1'),
                d1: delay(1, 'd2'),
                d2: delay(1, ''),
            },
        })

        const entered = await enterAtStep(user, steps, 'e')

        const state = await JourneyState.resume(entered, user)

        // user stops at delay
        expectStepPath(state!, ['e', 'd1'])

    })

    test('Steps - Gates', async () => {

        const { steps, user } = await setupJourney({
            data: {
                state: 'AL',
            },
            stepMap: {
                e: entrance(0, 'g1'),

                // match if user's State is Alabama
                g1: gate({
                    group: 'user',
                    type: 'string',
                    path: 'state',
                    operator: '=',
                    value: 'AL',
                }, ['g2', 'd1']),

                // match if users favorite guitar brand is Fender
                g2: gate({
                    group: 'event',
                    type: 'wrapper',
                    path: '$.name',
                    operator: '=',
                    value: 'purchased_guitar',
                    children: [
                        {
                            group: 'event',
                            type: 'string',
                            path: '$.brand',
                            operator: '=',
                            value: 'Fender',
                        },
                    ],
                }, ['d2', 'd3']),

                d1: delay(0, ''),
                d2: delay(0, ''),
                d3: delay(0, ''),
            },
        })

        const entered = await enterAtStep(user, steps, 'e')

        const state = await JourneyState.resume(entered, user)

        expectStepPath(state!, ['e', 'g1', 'g2', 'd3'])
    })

    //     test('user should be taken to action 2 or 3', async () => {

    //         const { project, journey } = await setup()
    //         const list = await List.insertAndFetch({
    //             project_id: project.id,
    //             type: 'dynamic',
    //             rule: {
    //                 type: 'string',
    //                 group: 'user',
    //                 path: '$.email',
    //                 operator: '=',
    //                 value: 'test1@twochris.com',
    //             },
    //         })

    //         const user = await User.insertAndFetch({
    //             project_id: project.id,
    //             external_id: '1',
    //             email: 'test2@twochris.com', // won't match the gate condition
    //             data: {},
    //         })

    //         // entrance -> gate -> (action1 | experiment -> (action2 | action3))
    //         const { steps } = await setJourneyStepMap(journey.id, {
    //             entrance: {
    //                 ...baseStep,
    //                 type: 'entrance',
    //                 children: [
    //                     {
    //                         external_id: 'gate',
    //                     },
    //                 ],
    //             },
    //             gate: {
    //                 ...baseStep,
    //                 type: 'gate',
    //                 data: {
    //                     list_id: list.id,
    //                 },
    //                 children: [
    //                     // if passed
    //                     {
    //                         external_id: 'action1',
    //                     },
    //                     // if failed
    //                     {
    //                         external_id: 'experiment',
    //                     },
    //                 ],
    //             },
    //             experiment: {
    //                 ...baseStep,
    //                 type: 'experiment',
    //                 children: [
    //                     {
    //                         external_id: 'action2',
    //                         data: {
    //                             ratio: 1,
    //                         },
    //                     },
    //                     {
    //                         external_id: 'action3',
    //                         data: {
    //                             ratio: 1,
    //                         },
    //                     },
    //                 ],
    //             },
    //             action1: {
    //                 ...baseStep,
    //                 type: 'action',
    //                 data: {
    //                     campaign_id: 0,
    //                 },
    //             },
    //             action2: {
    //                 ...baseStep,
    //                 type: 'action',
    //                 data: {
    //                     campaign_id: 0,
    //                 },
    //             },
    //             action3: {
    //                 ...baseStep,
    //                 type: 'action',
    //                 data: {
    //                     campaign_id: 0,
    //                 },
    //             },
    //         })

    //         const service = new JourneyService(journey.id)
    //         await service.run(user)

    //         const actionIds = steps
    //             .filter(s => s.external_id === 'action2' || s.external_id === 'action3')
    //             .map(s => s.id)
    //         const lastStep = await lastJourneyStep(user.id, journey.id)
    //         expect(actionIds).toContain(lastStep?.step_id)
    //     })

    //     test('user update step adds data to profile', async () => {

    //         const { project, journey } = await setup()

    //         const { steps } = await setJourneyStepMap(journey.id, {
    //             entrance: {
    //                 ...baseStep,
    //                 type: JourneyEntrance.type,
    //                 children: [
    //                     {
    //                         external_id: 'update',
    //                     },
    //                 ],
    //             },
    //             update: {
    //                 ...baseStep,
    //                 type: JourneyUpdate.type,
    //                 data: {
    //                     template: `
    //                         {
    //                             "field2": 2,
    //                             "fromUser": {
    //                                 "prevField2": "{{user.field2}}"
    //                             },
    //                             "fromEvent": "{{event.name}}"
    //                         }
    //                     `,
    //                 },
    //             },
    //         })

    //         const user = await User.insertAndFetch({
    //             project_id: project.id,
    //             external_id: '2',
    //             email: 'test3@twochris.com',
    //             data: {
    //                 field1: 1,
    //                 field2: 'two',
    //             },
    //         })

    //         const event = await UserEvent.insertAndFetch({
    //             project_id: project.id,
    //             user_id: user.id,
    //             name: 'signin',
    //             data: {
    //                 project: 'Parcelvoy',
    //             },
    //         })

    //         const service = new JourneyService(journey.id)

    //         await service.run(user, event)

    //         const updateStep = steps.find(s => s.external_id === 'update')!
    //         const lastStep = await lastJourneyStep(user.id, journey.id)
    //         expect(updateStep).toBeDefined()
    //         expect(lastStep?.step_id).toBe(updateStep.id)
    //         expect(user.data.field1).toBe(1)
    //         expect(user.data.field2).toBe(2)
    //         expect(user.data.fromUser.prevField2).toBe('two')
    //         expect(user.data.fromEvent).toEqual('signin')
    //     })

    //     test('user should only be added to a multi-entrance journey once', async () => {

    //         const { project, journey } = await setup()

    //         const list1 = await List.insertAndFetch({
    //             project_id: project.id,
    //             name: 'Multi-entrance Journey List 1',
    //             type: 'static',
    //         })

    //         const list2 = await List.insertAndFetch({
    //             project_id: project.id,
    //             name: 'Multi-entrance Journey List 2',
    //             type: 'static',
    //         })

    //         const { steps } = await setJourneyStepMap(journey.id, {
    //             entrance1: {
    //                 ...baseStep,
    //                 type: 'entrance',
    //                 data: {
    //                     list_id: list1.id,
    //                 },
    //                 children: [
    //                     {
    //                         external_id: 'gate1',
    //                     },
    //                 ],
    //             },
    //             entrance2: {
    //                 ...baseStep,
    //                 type: 'entrance',
    //                 data: {
    //                     list_id: list2.id,
    //                 },
    //                 children: [
    //                     {
    //                         external_id: 'gate2',
    //                     },
    //                 ],
    //             },
    //             gate1: {
    //                 ...baseStep,
    //                 type: 'gate',
    //             },
    //             gate2: {
    //                 ...baseStep,
    //                 type: 'gate',
    //             },
    //         })

    //         const user = await User.insertAndFetch({
    //             project_id: project.id,
    //             external_id: '1',
    //             data: {},
    //         })

    //         // add user to journey entrance 1 via list 1
    //         await enterJourneyFromList(list1, user)
    //         const gateStep = steps.find(s => s.external_id === 'gate1')
    //         let lastStep = await lastJourneyStep(user.id, journey.id)
    //         expect(gateStep).toBeDefined()
    //         expect(lastStep).toBeDefined()
    //         expect(lastStep!.step_id).toEqual(gateStep!.id)

    //         // when processed again via list 2, user state should remain unchanged
    //         await enterJourneyFromList(list2, user)
    //         lastStep = await lastJourneyStep(user.id, journey.id)
    //         expect(lastStep).toBeDefined()
    //         expect(lastStep!.step_id).toEqual(gateStep!.id)
    //     })
    // })

    // describe('enter journey from list', () => {

    //     test('only enter published journeys', async () => {

    //         const project = await Project.insertAndFetch({
    //             name: Date.now().toString(),
    //         })

    //         const list = await List.insertAndFetch({
    //             project_id: project.id,
    //             name: 'list',
    //         })

    //         const activeJourney = await Journey.insertAndFetch({
    //             project_id: project.id,
    //             name: 'Active Journey',
    //             published: true,
    //         })

    //         const inactiveJourney = await Journey.insertAndFetch({
    //             project_id: project.id,
    //             name: 'Inactive Journey',
    //         })

    //         await Promise.all([activeJourney, inactiveJourney].map(journey => setJourneyStepMap(journey.id, {
    //             entrance: {
    //                 type: 'entrance',
    //                 x: 0,
    //                 y: 0,
    //                 data: {
    //                     list_id: list.id,
    //                 },
    //             },
    //         })))

    //         const user = await User.insertAndFetch({
    //             project_id: project.id,
    //             external_id: 'abc',
    //         })

    //         await enterJourneyFromList(list, user)

    //         const userSteps = await JourneyUserStep.all(q => q.where('user_id', user.id))

    //         expect(userSteps.some(s => s.journey_id === activeJourney.id)).toBeTruthy()
    //         expect(userSteps.some(s => s.journey_id === inactiveJourney.id)).toBeFalsy()
    //     })
    // })
})
