import Project from '../../projects/Project'
import { RuleTree } from '../../rules/Rule'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { random, randomInt, uuid } from '../../utilities'
import { UserList } from '../List'
import { createList, listsForRule, populateList, updateList } from '../ListService'

describe('ListService', () => {

    const makeRule = async () => {
        const project = await Project.insertAndFetch({
            name: 'Dynamic List Project',
        })

        const ruleUuid = uuid()
        const eventUuid = uuid()

        const rule: RuleTree = {
            uuid: ruleUuid,
            group: 'parent',
            type: 'wrapper',
            operator: 'or',
            path: '',
            children: [
                {
                    uuid: uuid(),
                    parent_uuid: ruleUuid,
                    root_uuid: ruleUuid,
                    group: 'user',
                    type: 'string',
                    operator: '=',
                    path: '$.first_name',
                    value: 'chris',
                },
                {
                    uuid: eventUuid,
                    parent_uuid: ruleUuid,
                    root_uuid: ruleUuid,
                    group: 'event',
                    type: 'wrapper',
                    operator: 'and',
                    path: '$.name',
                    value: 'purchased',
                    children: [
                        {
                            uuid: uuid(),
                            parent_uuid: eventUuid,
                            root_uuid: ruleUuid,
                            group: 'event',
                            type: 'string',
                            operator: '=',
                            path: '$.food',
                            value: 'cake',
                        },
                    ],
                },
            ],
        }

        return { rule, project }
    }

    test('populate dynamic list', async () => {

        const eventNames = ['purchased', 'completed', 'viewed', 'launched']
        const { rule, project } = await makeRule()

        const list = await createList(project.id, {
            name: 'Dynamic List',
            type: 'dynamic',
            is_visible: true,
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

        await populateList(list)

        const userCount = await User.count(q => q.where('project_id', project.id))
        const matchCount = await UserList.count(q => q.where('list_id', list.id))

        expect(userCount).toBe(expectedUserCount)
        expect(matchCount).toBe(expectedMatchCount)

    })

    describe('listsForRule', () => {

        test('should not contain draft list', async () => {

            const { rule, project } = await makeRule()
            await createList(project.id, {
                name: 'Dynamic List',
                type: 'dynamic',
                is_visible: true,
                rule,
            })

            const lists = await listsForRule([rule.uuid], project.id)
            expect(lists.length).toEqual(0)
        })

        test('should contain published list', async () => {

            const { rule, project } = await makeRule()
            const list = await createList(project.id, {
                name: 'Dynamic List',
                type: 'dynamic',
                is_visible: true,
                rule,
            })

            await updateList(list, { name: list.name, published: true })

            const lists = await listsForRule([rule.uuid], project.id)
            expect(lists.length).toEqual(1)
            expect(lists[0]?.id).toEqual(list.id)
        })
    })
})
