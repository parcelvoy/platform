import { addDays } from 'date-fns'
import { RuleTree } from '../../rules/Rule'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import Journey from '../Journey'
import { setupProject, setupTestJourney } from './helpers'
import { enterJourneysFromEvent } from '../JourneyService'
import { JourneyStep, JourneyStepMapParams, JourneyUserStep } from '../JourneyStep'
import { make } from '../../rules/RuleEngine'
import { uuid } from '../../utilities'
import { JourneyState } from '../JourneyState'

describe('JourneyService', () => {

    const baseStep = {
        x: 0,
        y: 0,
        data: {},
    }

    const entrance = (list_id: number, childId: string) => {
        return {
            ...baseStep,
            type: 'entrance',
            data: {
                list_id,
            },
            data_key: 'entrance',
            children: [
                {
                    external_id: childId,
                },
            ],
        }
    }

    const gate = (rule: RuleTree, yes?: string, no?: string) => {
        const children: JourneyStepMapParams[string]['children'] = []
        if (yes) {
            children.push({ external_id: yes, path: 'yes' })
        }
        if (no) {
            children.push({ external_id: no, path: 'no' })
        }
        return {
            ...baseStep,
            type: 'gate',
            data: {
                rule,
            },
            children,
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

    const updateStep = (template: string, childId: string) => ({
        ...baseStep,
        type: 'update',
        data: {
            template,
        },
        children: [
            {
                external_id: childId,
            },
        ],
    })

    const linkStep = (target_id: number, childId: string) => ({
        ...baseStep,
        type: 'link',
        data: {
            target_id,
            delay: '1 minute',
        },
        children: [
            {
                external_id: childId,
            },
        ],
    })

    const expectStepPath = (state: JourneyState, expectedPath: string[]) => {
        const resultPath = state.userSteps.map(us => state.steps.find(s => us.step_id === s.id)?.external_id ?? '??').join('->')
        expect(resultPath).toEqual(expectedPath.join('->'))
    }

    const enterAtStep = async (user: User, steps: JourneyStep[], external_id: string, data?: Record<string, unknown>) => {
        const step = steps.find(s => s.external_id === external_id)!
        return await JourneyUserStep.insertAndFetch({
            journey_id: step.journey_id,
            step_id: step.id,
            user_id: user.id,
            type: 'completed',
            data,
        })
    }

    test('Steps - Entrance - Event-Based', async () => {

        const { steps, user } = await setupTestJourney({
            data: {},
            stepMap: {
                e: {
                    ...baseStep,
                    type: 'entrance',
                    data: {
                        trigger: 'event',
                        event_name: 'purchased gourd',
                    },
                },
            },
        })

        const event = await UserEvent.insertAndFetch({
            project_id: user.project_id,
            user_id: user.id,
            name: 'purchased gourd',
            data: {
                color: 'yellow',
            },
        })

        await enterJourneysFromEvent(event, user)

        const entrances = await JourneyUserStep.all(q => q.where('user_id', user.id))

        expect(entrances.map(e => e.step_id)).toContain(steps.find(s => s.external_id === 'e')!.id)

    })

    test('Steps - Delay', async () => {

        const { steps, user } = await setupTestJourney({
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

        const parentId = uuid()

        const { steps, user } = await setupTestJourney({
            data: {
                state: 'AL',
            },
            stepMap: {
                e: entrance(0, 'g1'),

                // match if user's State is Alabama
                g1: gate({
                    uuid: uuid(),
                    group: 'user',
                    type: 'string',
                    path: 'state',
                    operator: '=',
                    value: 'AL',
                }, 'g2', 'd1'),

                // match if users favorite guitar brand is Fender
                g2: gate({
                    uuid: parentId,
                    group: 'event',
                    type: 'wrapper',
                    path: '$.name',
                    operator: '=',
                    value: 'purchased_guitar',
                    children: [
                        {
                            uuid: uuid(),
                            parent_uuid: parentId,
                            group: 'event',
                            type: 'string',
                            path: '$.brand',
                            operator: '=',
                            value: 'Fender',
                        },
                    ],
                }, 'd2', 'd3'),

                d1: delay(0, ''),
                d2: delay(0, ''),
                d3: delay(0, ''),
            },
        })

        const entered = await enterAtStep(user, steps, 'e')

        const state = await JourneyState.resume(entered, user)

        expectStepPath(state!, ['e', 'g1', 'g2', 'd3'])
    })

    test('Steps - Update', async () => {

        const { steps, user } = await setupTestJourney({
            data: {
                field1: 1,
            },
            stepMap: {
                e: entrance(0, 'u'),
                u: updateStep(`
                    {
                        "field2": "{{journey.entrance.event.favorite_color}}"
                    }
                `, ''),
            },
        })

        const entered = await enterAtStep(user, steps, 'e', {
            event: {
                name: 'decided_favorite_color',
                favorite_color: 'green',
            },
        })

        const state = (await JourneyState.resume(entered, user))!

        expectStepPath(state, ['e', 'u'])
        expect(user.data.field1).toBe(1)
        expect(user.data.field2).toBe('green')

    })

    test('Steps - Entrance', async () => {

        const { project } = await setupProject()

        const journey2 = await Journey.create(project.id, 'Second', {
            e: entrance(0, 'd'),
            d: delay(0, ''),
        })

        const journey1 = await Journey.create(project.id, 'First', {
            e: entrance(0, 'l'),
            l: linkStep(journey2.journey.id, ''),
        })

        const user = await User.insertAndFetch({
            project_id: project.id,
            external_id: 'abcd',
            data: {},
        })

        let e = await enterAtStep(user, journey1.steps, 'e')

        let state = (await JourneyState.resume(e))!

        expectStepPath(state, ['e', 'l'])

        e = (await JourneyUserStep.first(q => q
            .where('user_id', user.id)
            .where('journey_id', journey2.journey.id)
            .whereNull('entrance_id'),
        ))!

        expect(e).not.toBeUndefined()

        state = (await JourneyState.resume(e))!

        expectStepPath(state, ['e', 'd'])

    })

    test('JourneyState - prevent infinite loop', async () => {

        const { project } = await setupProject()

        const rule = make({
            type: 'boolean',
            group: 'user',
            path: 'some_field',
            operator: '=',
            value: 'true',
        })

        const { steps } = await Journey.create(project.id, 'infinite loop journey', {
            e: entrance(0, 'g1'),
            g1: gate(rule, 'g2', 'g3'),
            g2: gate(rule, 'g1', 'g3'),
            g3: gate(rule),
        })

        const user = await User.insertAndFetch({
            project_id: project.id,
            external_id: 'xyz',
            data: {
                some_field: true,
            },
        })

        const entranceStep = await enterAtStep(user, steps, 'e')

        const state = (await JourneyState.resume(entranceStep, user))!

        expectStepPath(state, ['e', 'g1', 'g2'])

    })
})
