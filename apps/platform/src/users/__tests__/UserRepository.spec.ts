import { Admin } from '../../auth/Admin'
import { createProject } from '../../projects/ProjectService'
import { createUser, getUserFromClientId } from '../../users/UserRepository'
import { uuid } from '../../utilities'

describe('UserRepository', () => {
    describe('getUserFromClientId', () => {
        test('if an external ID matches return', async () => {
            const admin = await Admin.insertAndFetch({
                first_name: uuid(),
                last_name: uuid(),
                email: `${uuid()}@test.com`,
            })
            const project = await createProject(admin, {
                name: uuid(),
                timezone: 'utc',
            })
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
            const admin = await Admin.insertAndFetch({
                first_name: uuid(),
                last_name: uuid(),
                email: `${uuid()}@test.com`,
            })
            const project = await createProject(admin, {
                name: uuid(),
                timezone: 'utc',
            })
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
})
