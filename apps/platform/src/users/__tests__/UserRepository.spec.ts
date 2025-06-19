import { subDays } from 'date-fns'
import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'
import { make } from '../../rules/RuleEngine'
import { createUser, getUserEventsForRules, getUserFromClientId, saveDevice } from '../../users/UserRepository'
import { uuid } from '../../utilities'
import { User } from '../User'
import { UserEvent } from '../UserEvent'
import { createEvent } from '../UserEventRepository'

describe('UserRepository', () => {
    describe('getUserFromClientId', () => {
        test('if an external ID matches return', async () => {
            const project = await createTestProject()
            const anonymousId = uuid()
            const externalId = uuid()
            const user1 = await createUser(project.id, {
                anonymous_id: anonymousId,
                external_id: externalId,
            })

            const user = await getUserFromClientId(project.id, {
                external_id: externalId,
            })
            expect(user1.id).toEqual(user?.id)
            expect(user1.external_id).toEqual(user?.external_id)
        })

        test('if an external ID is present always return that record', async () => {
            const project = await createTestProject()
            const anonymousId = uuid()
            const externalId = uuid()
            await createUser(project.id, {
                anonymous_id: anonymousId,
                external_id: uuid(),
            })
            const user2 = await createUser(project.id, {
                anonymous_id: uuid(),
                external_id: externalId,
            })

            const user = await getUserFromClientId(project.id, {
                anonymous_id: anonymousId,
                external_id: externalId,
            })
            expect(user2.id).toEqual(user?.id)
            expect(user?.external_id).toEqual(externalId)
        })
    })

    describe('saveDevice', () => {
        test('add a device to a user', async () => {
            const project = await createTestProject()
            const user = await createUser(project.id, {
                external_id: uuid(),
            })

            const device = await saveDevice(project.id, {
                external_id: user.external_id,
                device_id: uuid(),
                token: uuid(),
                os: 'ios',
                model: 'iPhone',
                app_build: '1',
                app_version: '1.0',
            })

            const freshUser = await User.find(user.id)
            expect(freshUser?.devices?.length).toEqual(1)
            expect(freshUser?.devices?.[0].device_id).toEqual(device?.device_id)
        })

        test('update a device for a user', async () => {
            const project = await createTestProject()
            const deviceId = uuid()
            const token = uuid()
            const user = await createUser(project.id, {
                external_id: uuid(),
            })
            await saveDevice(project.id, {
                external_id: user.external_id,
                device_id: deviceId,
                token: uuid(),
                os: 'ios',
                model: 'iPhone',
                app_build: '1',
                app_version: '1.0',
            })
            await saveDevice(project.id, {
                external_id: user.external_id,
                device_id: deviceId,
                token,
                os: 'ios',
                model: 'iPhone',
                app_build: '2',
                app_version: '1.1',
            })

            const freshUser = await User.find(user.id)
            expect(freshUser?.devices?.length).toEqual(1)
            expect(freshUser?.devices?.[0].device_id).toEqual(deviceId)
            expect(freshUser?.devices?.[0].token).toEqual(token)
            expect(freshUser?.devices?.[0].app_build).toEqual('2')
        })
    })

    describe('getUserEventsForRules', () => {
        test('returns user events for rules', async () => {
            const project = await createTestProject()
            const user = await createUser(project.id, {
                external_id: uuid(),
            })
            await createEvent(user, {
                name: 'event1',
                data: { key: 'value1' },
            })
            await createEvent(user, {
                name: 'event1',
                data: { key: 'value2' },
            })
            await createEvent(user, {
                name: 'event3',
                data: { key: 'value3' },
            })

            const rules = [
                make({
                    group: 'event',
                    path: 'name',
                    value: 'event1',
                    type: 'wrapper',
                    operator: 'or',
                    children: [
                        make({ type: 'number', path: 'score.total', operator: '<', value: 5 }),
                        make({ type: 'boolean', path: 'score.isRecord', value: true }),
                    ],
                    frequency: {
                        period: {
                            unit: 'day',
                            value: 7,
                            type: 'rolling',
                        },
                        count: 2,
                        operator: '>=',
                    },
                }),
            ]

            const events = await getUserEventsForRules(user.id, rules)
            expect(events).toHaveLength(2)
            expect(events[0].name).toEqual('event1')
        })

        test('does not include events outside the date range', async () => {
            const project = await createTestProject()
            const user = await createUser(project.id, {
                external_id: uuid(),
            })
            await UserEvent.insert({
                name: 'event1',
                data: { key: 'value1' },
                created_at: subDays(new Date(), 10),
                user_id: user.id,
                project_id: project.id,
            })
            await createEvent(user, {
                name: 'event1',
                data: { key: 'value1' },
            })
            await createEvent(user, {
                name: 'event2',
                data: { key: 'value2' },
            })

            const rules = [
                make({
                    group: 'event',
                    path: 'name',
                    value: 'event1',
                    type: 'wrapper',
                    operator: 'or',
                    children: [
                        make({ type: 'number', path: 'score.total', operator: '<', value: 5 }),
                        make({ type: 'boolean', path: 'score.isRecord', value: true }),
                    ],
                    frequency: {
                        period: {
                            unit: 'day',
                            value: 7,
                            type: 'rolling',
                        },
                        count: 2,
                        operator: '>=',
                    },
                }),
            ]

            const events = await getUserEventsForRules(user.id, rules)
            expect(events).toHaveLength(1)
            expect(events[0].name).toEqual('event1')
        })
    })
})
