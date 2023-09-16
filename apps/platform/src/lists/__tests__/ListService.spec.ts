import Project from '../../projects/Project'
import Rule from '../../rules/Rule'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { random, randomInt } from '../../utilities'
import List, { UserList } from '../List'
import { populateList } from '../ListService'

describe('ListService', () => {

    test('populate dynamic list', async () => {

        const project = await Project.insertAndFetch({
            name: 'Dynamic List Project',
        })

        const eventNames = ['purchased', 'completed', 'viewed', 'launched']

        const rule: Rule = {
            group: 'user',
            type: 'wrapper',
            operator: 'or',
            path: '',
            children: [
                {
                    group: 'user',
                    type: 'string',
                    operator: '=',
                    path: 'first_name',
                    value: 'chris',
                },
                {
                    group: 'event',
                    type: 'wrapper',
                    operator: 'and',
                    path: 'name',
                    value: 'purchased',
                    children: [
                        {
                            group: 'event',
                            type: 'string',
                            operator: '=',
                            path: 'food',
                            value: 'cake',
                        },
                    ],
                },
            ],
        }

        const list = await List.insertAndFetch({
            project_id: project.id,
            name: 'Dynamic List',
            type: 'dynamic',
            rule,
        })

        const expectedUserCount = 200
        let expectedMatchCount = 0

        for (let i = 0; i < expectedUserCount; i++) {
            const shouldMatch = (i + 1) % 20 === 0
            if (shouldMatch) expectedMatchCount++

            const user = await User.insertAndFetch({
                project_id: project.id,
                external_id: `test-${i}`,
                data: {
                    first_name: shouldMatch ? 'chris' : i % 10 === 0 ? 'claire' : undefined,
                    favoriteNumber: i,
                },
            })

            const events: Partial<UserEvent>[] = Array.from({ length: randomInt(3, 50) }).map((_, i) => ({
                project_id: project.id,
                user_id: user.id,
                name: random(eventNames),
                data: {
                    something: i,
                },
            }))

            if (i === 15) {
                events.push({
                    project_id: project.id,
                    user_id: user.id,
                    name: 'purchased',
                    data: {
                        food: 'cake',
                    },
                })
                expectedMatchCount++
            }

            // create events
            await UserEvent.insert(events)
        }

        await populateList(list, rule)

        const userCount = await User.count(q => q.where('project_id', project.id))
        const matchCount = await UserList.count(q => q.where('list_id', list.id))

        expect(userCount).toBe(expectedUserCount)
        expect(matchCount).toBe(expectedMatchCount)

    })

})
