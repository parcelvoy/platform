import { createTestProject } from '../../projects/__tests__/ProjectTestHelpers'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { uuid } from '../../utilities'
import Rule from '../Rule'
import { RuleWithEvaluationResult, checkRules, matchingRulesForEvent, matchingRulesForUser } from '../RuleService'

describe('RuleService', () => {
    const makeWrapper = async (project_id: number) => {
        return await Rule.insertAndFetch({
            project_id,
            uuid: uuid(),
            path: '',
            type: 'wrapper',
            group: 'parent',
            operator: 'any',
        })
    }

    describe('checkRules', () => {
        test('a non passing event rule should fail', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { numberOfThings: 10 },
            })
            const root = await makeWrapper(project_id)
            const rules: RuleWithEvaluationResult[] = [{
                uuid: uuid(),
                group: 'event',
                type: 'wrapper',
                path: '$.name',
                operator: '=',
                value: 'Entered',
                result: false,
            }]

            const result = checkRules(user, root, rules)
            expect(result).toBe(false)
        })

        test('a non passing user rule should fail', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { numberOfThings: 2 },
            })
            const root = await makeWrapper(project_id)
            const rules: RuleWithEvaluationResult[] = [{
                uuid: uuid(),
                group: 'user',
                type: 'number',
                path: '$.numberOfThings',
                operator: '>',
                value: 5,
            }, {
                uuid: uuid(),
                group: 'event',
                type: 'wrapper',
                path: '$.name',
                operator: '=',
                value: 'Entered',
                result: true,
            }]

            const result = await checkRules(user, root, rules)
            expect(result).toBe(false)
        })
    })

    describe('matchingRulesForUser', () => {
        test('return a list of matching rules', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { first_name: 'peter' },
            })
            const root = await makeWrapper(project_id)
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: root.uuid,
                root_uuid: root.uuid,
                group: 'user',
                type: 'string',
                path: '$.first_name',
                operator: '=',
                value: 'peter',
            })

            const result = await matchingRulesForUser(user)
            expect(result.success[0]).toEqual(root.uuid)
        })

        test('return a list of failing rules', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { first_name: 'paul' },
            })
            const root = await makeWrapper(project_id)
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: root.uuid,
                root_uuid: root.uuid,
                group: 'user',
                type: 'string',
                path: '$.first_name',
                operator: '=',
                value: 'peter',
            })

            const result = await matchingRulesForUser(user)
            expect(result.failure[0]).toEqual(root.uuid)
        })
    })

    describe('matchingRulesForEvent', () => {
        test('only event name rule, return a list of matching', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { first_name: 'peter' },
            })
            const root = await makeWrapper(project_id)
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: root.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'wrapper',
                path: '$.name',
                operator: 'and',
                value: 'Goal Scored',
            })
            const event = await UserEvent.insertAndFetch({
                project_id,
                user_id: user.id,
                name: 'Goal Scored',
                data: { high_score: 20 },
            })

            const result = await matchingRulesForEvent(user, event)
            expect(result.success[0]).toEqual(root.uuid)
        })

        test('only event name rule, no matching', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { first_name: 'peter' },
            })
            const root = await makeWrapper(project_id)
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: root.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'wrapper',
                path: '$.name',
                operator: '=',
                value: 'Goal Scored',
            })
            const event = await UserEvent.insertAndFetch({
                project_id,
                user_id: user.id,
                name: 'Product Purchased',
            })

            const result = await matchingRulesForEvent(user, event)
            expect(result.success).toEqual([])
        })

        test('event with filter, return a list of matching', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { first_name: 'peter' },
            })
            const root = await makeWrapper(project_id)
            const rule1 = await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: root.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'wrapper',
                path: '$.name',
                operator: 'and',
                value: 'Goal Scored',
            })
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: rule1.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'number',
                path: '$.high_score',
                operator: '=',
                value: 20,
            })

            const event = await UserEvent.insertAndFetch({
                project_id,
                user_id: user.id,
                name: 'Goal Scored',
                data: { high_score: 20 },
            })

            const result = await matchingRulesForEvent(user, event)
            expect(result.success[0]).toEqual(root.uuid)
        })

        test('event with multiple filters, return a list of matching', async () => {
            const { id: project_id } = await createTestProject()
            const user = await User.insertAndFetch({
                project_id,
                external_id: uuid(),
                data: { first_name: 'peter' },
            })
            const root = await makeWrapper(project_id)
            const rule1 = await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: root.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'wrapper',
                path: '$.name',
                operator: 'and',
                value: 'Goal Scored',
            })
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: rule1.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'number',
                path: '$.high_score',
                operator: '=',
                value: 20,
            })
            await Rule.insertAndFetch({
                project_id,
                uuid: uuid(),
                parent_uuid: rule1.uuid,
                root_uuid: root.uuid,
                group: 'event',
                type: 'string',
                path: '$.location',
                operator: '=',
                value: 'top',
            })

            const event = await UserEvent.insertAndFetch({
                project_id,
                user_id: user.id,
                name: 'Goal Scored',
                data: { high_score: 20, location: 'top' },
            })

            const result = await matchingRulesForEvent(user, event)
            expect(result.success[0]).toEqual(root.uuid)
        })
    })
})
