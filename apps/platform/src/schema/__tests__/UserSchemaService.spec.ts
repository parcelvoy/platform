import Project from '../../projects/Project'
import { ProjectRulePath } from '../../rules/ProjectRulePath'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { addLeafPaths, syncUserDataPaths } from '../UserSchemaService'
import { sleep } from '../../utilities'
import { startOfSecond } from 'date-fns'
import { reservedPaths } from '../../rules/RuleHelpers'

describe('UserSchemaService', () => {
    describe('path extraction', () => {
        test('collects all leaf node paths where value is not undefined', () => {
            const data = {
                one: 1,
                two: [2, true],
                three: {
                    four: 'something',
                    five: [
                        {
                            six: 'x',
                        },
                        {
                            six: 'y',
                        },
                    ],
                    eight: undefined, // shouldn't include this
                    nine: null, // should include this
                },
            }

            const set = new Set<string>()

            addLeafPaths(set, data)

            const arr = Array.from(set.values())

            expect(arr).not.toContain('$')
            expect(arr).toContain('$.one')
            expect(arr).not.toContain('$.two')
            expect(arr).toContain('$.two[*]')
            expect(arr).toContain('$.three.four')
            expect(arr).not.toContain('$.three.five[*]')
            expect(arr).toContain('$.three.five[*].six')
            expect(arr).not.toContain('$.three.eight')
            expect(arr).toContain('$.three.nine')
        })
    })
    describe('sync paths', () => {

        const setup = async () => {
            const project_id = await Project.insert({
                name: `Test Project ${Date.now()}`,
            })

            let user_id = await User.insert({
                project_id,
                data: {
                    x: 1,
                    y: [
                        {
                            z: 'hi',
                        },
                    ],
                },
            })

            await UserEvent.insert({
                project_id,
                user_id,
                name: 'ate',
                data: {
                    food: 'cake',
                },
            })

            user_id = await User.insert({
                project_id,
                data: {
                    x: 2,
                    y: null,
                    z: undefined,
                },
            })

            await UserEvent.insert({
                project_id,
                user_id,
                name: 'ate',
                data: {
                    food: 'pizza',
                },
            })

            await UserEvent.insert({
                project_id,
                user_id,
                name: 'drive',
                data: {
                    vehicle: 'car',
                },
            })

            return { project_id }
        }

        test('extract and save all user+event paths for project', async () => {

            const { project_id } = await setup()

            await syncUserDataPaths({ project_id })

            const paths = await ProjectRulePath.all(q => q.where('project_id', project_id))

            // exactly one copy of path added
            expect(paths.filter(p => p.type === 'user' && p.path === '$.x').length).toEqual(1)
            expect(paths.find(p => p.type === 'event' && p.name === 'ate' && p.path === '$.food')).not.toBeUndefined()
        })

        test('merge in delta fields', async () => {

            const { project_id } = await setup()

            await syncUserDataPaths({
                project_id,
            })

            await sleep(2000)

            const dt = new Date()

            const user_id = await User.insert({
                project_id,
                data: {
                    a: 1,
                },
            })

            await UserEvent.insert({
                project_id,
                user_id,
                name: 'test',
                data: {
                    feature: 'schema-sync',
                },
            })

            await syncUserDataPaths({
                project_id,
                updatedAfter: startOfSecond(dt),
            })

            const paths = await ProjectRulePath.all(q => q.where('project_id', project_id))

            // make sure new path is added
            expect(paths.filter(p => p.type === 'user' && p.path === '$.a').length).toEqual(1)

            // make sure old paths aren't removed
            expect(paths.filter(p => p.type === 'event' && p.name === 'drive' && p.path === '$.vehicle').length).toEqual(1)
        })

        test('sync w/o delta removes unused paths', async () => {

            const { project_id } = await setup()

            await syncUserDataPaths({
                project_id,
            })

            await User.update(q => q.where('project_id', project_id), {
                data: {
                    f: 1,
                },
            })

            await UserEvent.delete(q => q.where('project_id', project_id))

            await syncUserDataPaths({
                project_id,
            })

            const paths = await ProjectRulePath.all(q => q.where('project_id', project_id))

            const count = reservedPaths.user.length + 1
            expect(paths.length).toEqual(count) // only '$.f'

        })
    })
})
