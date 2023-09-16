import { subDays } from 'date-fns'
import { check, make } from '../RuleEngine'

describe('RuleEngine', () => {
    describe('wrapper', () => {
        test('event name match', () => {
            const id = 'abcd'
            const name = 'Account Created'
            const input = {
                user: {
                    id,
                },
                events: [
                    {
                        name,
                    },
                ],
            }
            const shouldPass = check(input, make({
                type: 'wrapper',
                operator: 'and',
                children: [
                    // match user id
                    make({
                        type: 'string',
                        operator: '=',
                        path: 'id',
                        value: id,
                    }),
                    // this should make if the user has done this event ever
                    make({
                        type: 'wrapper',
                        group: 'event',
                        path: 'name',
                        value: name,
                    }),
                ],
            }))
            expect(shouldPass).toBeTruthy()
        })
    })

    describe('string', () => {
        test('equals', () => {
            const email = 'test@test.com'
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email,
                        name: 'Name',
                    },
                    events: [],
                },
                make({
                    type: 'string',
                    operator: '=',
                    path: 'email',
                    value: email,
                }),
            )
            expect(shouldPass).toBeTruthy()
        })

        test('does not equals', () => {
            const email = 'test@test.com'
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email,
                        name: 'Name',
                    },
                    events: [],
                },
                make({ type: 'string', path: '$.email', operator: '!=', value: email }),
            )
            expect(shouldPass).toBeFalsy()
        })

        test('is set', () => {
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email: 'test@test.com',
                        name: 'Name',
                    },
                    events: [],
                },
                make({ type: 'string', path: '$.project', operator: 'is set' }),
            )
            expect(shouldPass).toBeFalsy()
        })
    })

    describe('date', () => {
        test('is set', () => {
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email: 'test@test.com',
                        createdAt: Date.now(),
                    },
                    events: [],
                },
                make({ type: 'date', path: '$.createdAt', operator: 'is set' }),
            )
            expect(shouldPass).toBeTruthy()
        })

        test('greater than or equals', () => {
            const now = Date.now()
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email: 'test@test.com',
                        createdAt: now,
                    },
                    events: [],
                },
                make({ type: 'date', path: '$.createdAt', operator: '>=', value: now }),
            )
            expect(shouldPass).toBeTruthy()
        })

        test('compilation', () => {
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email: 'test@test.com',
                        createdAt: subDays(new Date(), 1).getTime(),
                    },
                    events: [],
                },
                make({ type: 'date', path: '$.createdAt', operator: '>', value: '{{subDate "now" 1 "months" }}' }),
            )
            expect(shouldPass).toBeTruthy()
        })
    })

    describe('multiple', () => {
        test('combination event and user and types', () => {
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email: 'test@test.com',
                        name: 'Name',
                        project: 'Parcelvoy',
                    },
                    events: [
                        {
                            name: 'beat-game',
                            score: {
                                total: 5,
                                isRecord: true,
                            },
                        },
                    ],
                },
                [
                    make({ type: 'string', path: '$.project', operator: 'is set' }),
                    make({
                        type: 'wrapper',
                        group: 'event',
                        path: 'name',
                        value: 'beat-game',
                        operator: 'and',
                        children: [
                            make({
                                type: 'number',
                                path: 'score.total',
                                operator: '<=',
                                value: '5',
                            }),
                            make({
                                type: 'boolean',
                                path: 'score.isRecord',
                            }),
                        ],
                    }),
                ],
            )
            expect(shouldPass).toBeTruthy()
        })

        test('combination of conditional clauses on rules', () => {
            const shouldPass = check(
                {
                    user: {
                        id: 'abcd',
                        email: 'test@test.com',
                        name: 'Name',
                        project: 'Parcelvoy',
                    },
                    events: [
                        {
                            name: 'beat-game',
                            score: {
                                total: 5,
                                isRecord: true,
                            },
                        },
                    ],
                },
                [
                    make({ type: 'string', path: '$.project', operator: 'is set' }),
                    make({
                        group: 'event',
                        path: 'name',
                        value: 'beat-game',
                        type: 'wrapper',
                        operator: 'or',
                        children: [
                            make({ type: 'number', path: 'score.total', operator: '<', value: 5 }),
                            make({ type: 'boolean', path: 'score.isRecord', value: true }),
                        ],
                    }),
                ],
            )
            expect(shouldPass).toBeTruthy()
        })
    })
})
