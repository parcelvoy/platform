import { subDays } from 'date-fns'
import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'
import { make } from '../../rules/RuleEngine'
import { createUser, getUserEventsForRules, getUserFromClientId, saveDevice } from '../../users/UserRepository'
import { uuid } from '../../utilities'
import { User } from '../User'
import { UserEvent } from '../UserEvent'
import { createEvent } from '../UserEventRepository'
import { Device } from '../Device'

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

            const deviceUuid = uuid()
            const deviceId = await saveDevice(project.id, {
                external_id: user.external_id,
                device_id: deviceUuid,
                token: uuid(),
                os: 'ios',
                model: 'iPhone',
                app_build: '1',
                app_version: '1.0',
            })

            const userDb = await User.find(user.id)
            const deviceDb = await Device.find(deviceId)
            expect(userDb?.has_push_device).toEqual(true)
            expect(deviceDb?.user_id).toEqual(userDb?.id)
            expect(deviceDb?.device_id).toEqual(deviceUuid)
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

            const devices = await Device.all(qb => qb.where('user_id', user.id))
            expect(devices.length).toEqual(1)
            expect(devices[0].device_id).toEqual(deviceId)
            expect(devices[0].token).toEqual(token)
            expect(devices[0].app_build).toEqual('2')
        })

        test('changing a devices user moves it', async () => {
            const project = await createTestProject()
            const deviceId = uuid()
            const token = uuid()
            const user = await createUser(project.id, {
                external_id: uuid(),
            })
            const user2 = await createUser(project.id, {
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
                external_id: user2.external_id,
                device_id: deviceId,
                token,
                os: 'ios',
                model: 'iPhone',
                app_build: '2',
                app_version: '1.1',
            })

            const devices = await Device.all(qb => qb.where('user_id', user.id))
            const devices2 = await Device.all(qb => qb.where('user_id', user2.id))
            const userDb1 = await User.find(user.id)
            const userDb2 = await User.find(user2.id)
            expect(devices.length).toEqual(0)
            expect(devices2.length).toEqual(1)
            expect(userDb1?.has_push_device).toEqual(false)
            expect(userDb2?.has_push_device).toEqual(true)
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

            const rule = make({
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
            })

            const events = await getUserEventsForRules(user.id, rule)
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

            const rule = make({
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
            })

            const events = await getUserEventsForRules(user.id, rule)
            expect(events).toHaveLength(1)
            expect(events[0].name).toEqual('event1')
        })
    })
})
