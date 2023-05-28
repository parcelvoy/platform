import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'
import { UserSubscription } from '../../subscriptions/Subscription'
import { createUser, getUserFromClientId, saveDevice } from '../../users/UserRepository'
import { uuid } from '../../utilities'
import { User } from '../User'

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

            const subscriptions = await UserSubscription.all(qb => qb.where('user_id', user.id))
            const device = await saveDevice(project.id, {
                external_id: user.external_id,
                device_id: uuid(),
                token: uuid(),
                os: 'ios',
                model: 'iPhone',
                app_build: '1',
                app_version: '1.0',
            })

            const subscriptionsAfter = await UserSubscription.all(qb => qb.where('user_id', user.id))
            const freshUser = await User.find(user.id)
            expect(subscriptions.length).toEqual(0)
            expect(subscriptionsAfter.length).toEqual(1)
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
})
