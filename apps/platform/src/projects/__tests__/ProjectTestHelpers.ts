import Admin from '../../auth/Admin'
import { uuid } from '../../utilities'
import { createProject } from '../ProjectService'

export const createTestProject = async () => {
    const admin = await Admin.insertAndFetch({
        first_name: uuid(),
        last_name: uuid(),
        email: `${uuid()}@test.com`,
    })
    return await createProject(admin, {
        name: uuid(),
        timezone: 'utc',
        locale: 'en',
    })
}
