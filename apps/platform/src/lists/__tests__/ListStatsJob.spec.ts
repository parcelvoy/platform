import { addUserToList } from '../../lists/ListService'
import { User } from '../../users/User'
import { uuid } from '../../utilities'
import ListStatsJob from '../ListStatsJob'
import List, { UserList } from '../List'
import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'

afterEach(() => {
    jest.clearAllMocks()
})

describe('ListStatsJob', () => {

    test('initial count gets complete total', async () => {
        const project = await createTestProject()
        const list = await List.insertAndFetch({
            name: uuid(),
            project_id: project.id,
            is_visible: true,
        })

        const user = await User.insertAndFetch({ project_id: project.id })
        const user2 = await User.insertAndFetch({ project_id: project.id })

        await addUserToList(user, list)
        await addUserToList(user2, list)

        await ListStatsJob.handler({ listId: list.id, projectId: project.id })

        const count = await UserList.count(qb => qb.where('list_id', list.id))
        expect(count).toEqual(2)
    })

    test('subsequent count gets new complete total', async () => {
        const project = await createTestProject()
        const list = await List.insertAndFetch({
            name: uuid(),
            project_id: project.id,
            is_visible: true,
        })

        const user = await User.insertAndFetch({ project_id: project.id })
        const user2 = await User.insertAndFetch({ project_id: project.id })
        const user3 = await User.insertAndFetch({ project_id: project.id })
        const user4 = await User.insertAndFetch({ project_id: project.id })

        await addUserToList(user, list)
        await addUserToList(user2, list)

        await ListStatsJob.handler({ listId: list.id, projectId: 1 })

        await addUserToList(user3, list)
        await addUserToList(user4, list)

        await ListStatsJob.handler({ listId: list.id, projectId: 1 })

        const count = await UserList.count(qb => qb.where('list_id', list.id))
        expect(count).toEqual(4)
    })
})
