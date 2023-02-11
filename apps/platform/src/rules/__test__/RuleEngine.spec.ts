import { subDays } from 'date-fns'
import { check, make } from '../RuleEngine'

describe('RuleEngine', () => {
    describe('string', () => {
        test('equals', () => {
            const email = 'test@test.com'
            const value = {
                user: {
                    id: 'abcd',
                    email,
                    name: 'Name',
                },
            }
            const shouldPass = check(value, [
                make({ type: 'string', path: '$.email', value: email }),
            ])

            expect(shouldPass).toBeTruthy()
        })

        test('does not equals', () => {
            const email = 'test@test.com'
            const value = {
                user: {
                    id: 'abcd',
                    email,
                    name: 'Name',
                },
            }
            const shouldPass = check(value,
                make({ type: 'string', path: '$.email', operator: '!=', value: email }),
            )
            expect(shouldPass).toBeFalsy()
        })

        test('is set', () => {
            const value = {
                user: {
                    id: 'abcd',
                    email: 'test@test.com',
                    name: 'Name',
                },
            }
            const shouldPass = check(value, make({ type: 'string', path: '$.project', operator: 'is set' }),
            )
            expect(shouldPass).toBeFalsy()
        })
    })

    describe('date', () => {
        test('is set', () => {
            const value = {
                user: {
                    id: 'abcd',
                    email: 'test@test.com',
                    createdAt: Date.now(),
                },
            }
            const shouldPass = check(value, [
                make({ type: 'date', path: '$.createdAt', operator: 'is set' }),
            ])
            expect(shouldPass).toBeTruthy()
        })

        test('greater than or equals', () => {
            const now = Date.now()
            const value = {
                user: {
                    id: 'abcd',
                    email: 'test@test.com',
                    createdAt: now,
                },
            }
            const shouldPass = check(value, [
                make({ type: 'date', path: '$.createdAt', operator: '>=', value: now }),
            ])
            expect(shouldPass).toBeTruthy()
        })

        test('compilation', () => {
            const value = {
                user: {
                    id: 'abcd',
                    email: 'test@test.com',
                    createdAt: subDays(new Date(), 1).getTime(),
                },
            }
            const shouldPass = check(value, [
                make({ type: 'date', path: '$.createdAt', operator: '>', value: '{{subDate "now" 1 "months" }}' }),
            ])
            expect(shouldPass).toBeTruthy()
        })
    })

    describe('multiple', () => {
        test('combination event and user and types', () => {
            const value = {
                user: {
                    id: 'abcd',
                    email: 'test@test.com',
                    name: 'Name',
                    project: 'Parcelvoy',
                },
                event: {
                    name: 'beat-game',
                    score: {
                        total: 5,
                        isRecord: true,
                    },
                },
            }
            const shouldPass = check(value, [
                make({ type: 'string', path: '$.project', operator: 'is set' }),
                make({ type: 'number', group: 'event', path: '$.score.total', operator: '<=', value: 5 }),
                make({ type: 'boolean', group: 'event', path: '$.score.isRecord', value: true }),
            ])
            expect(shouldPass).toBeTruthy()
        })

        test('combination of conditional clauses on rules', () => {
            const value = {
                user: {
                    id: 'abcd',
                    email: 'test@test.com',
                    name: 'Name',
                    project: 'Parcelvoy',
                },
                event: {
                    name: 'beat-game',
                    score: {
                        total: 5,
                        isRecord: true,
                    },
                },
            }
            const shouldPass = check(value, [
                make({ type: 'string', path: '$.project', operator: 'is set' }),
                make({
                    type: 'wrapper',
                    operator: 'or',
                    children: [
                        make({ type: 'number', group: 'event', path: '$.score.total', operator: '<', value: 5 }),
                        make({ type: 'boolean', group: 'event', path: '$.score.isRecord', value: true }),
                    ],
                }),
            ])
            expect(shouldPass).toBeTruthy()
        })
    })
})
