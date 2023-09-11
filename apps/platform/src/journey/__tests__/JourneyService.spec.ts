import { addDays } from 'date-fns'
import List, { UserList } from '../../lists/List'
import Organization from '../../organizations/Organization'
import Project from '../../projects/Project'
import Rule from '../../rules/Rule'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { uuid } from '../../utilities'
import Journey from '../Journey'
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

        const entranceStepIds = await JourneyUserStep.all(qb => qb
            .whereNull('entrance_id')
            .where('user_id', user.id),
        ).then(x => x.map(e => e.step_id))

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

        let state = (await JourneyState.resume(entered, user))!

        // user stops at delay
        expectStepPath(state, ['e', 'd1'])

        const delayStep = state.userSteps[state!.userSteps.length - 1]

        // move delay into past
        await JourneyUserStep.update(q => q.where('id', delayStep.id), {
            delay_until: addDays(delayStep.delay_until!, -2),
        })

        state = (await JourneyState.resume(entered, user))!

        expectStepPath(state, ['e', 'd1', 'd2'])

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
})
