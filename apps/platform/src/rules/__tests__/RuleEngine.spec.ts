import { subDays } from 'date-fns'
import { check, make, getRuleQuery } from '../RuleEngine'

describe('RuleEngine', () => {
    describe('wrapper', () => {
        describe('event name match', () => {
            const setup = () => {
                const id = 'abcd'
                const name = 'Account Created'
                const rule = make({
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
                            operator: 'and',
                        }),
                    ],
                })
                return { id, name, rule }
            }

            test('check', () => {
                const { id, name, rule } = setup()
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
                const shouldPass = check(input, rule)
                expect(shouldPass).toBeTruthy()
            })

            test('query', () => {
                const { rule } = setup()
                const result = getRuleQuery(1, rule)
                expect(result).toMatchSnapshot()
            })
        })
    })

    describe('string', () => {
        describe('equals', () => {
            test('check', () => {
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

            test('query', () => {
                const email = 'test@test.com'
                const query = getRuleQuery(
                    1,
                    make({
                        type: 'string',
                        operator: '=',
                        path: 'email',
                        value: email,
                    }),
                )
                expect(query).toMatchSnapshot()
            })
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

        describe('is set', () => {
            test('check', () => {
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

            test('query', () => {
                const query = getRuleQuery(
                    1,
                    make({ type: 'string', path: '$.project', operator: 'is set' }),
                )
                expect(query).toMatchSnapshot()
            })
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
        describe('combination event and user and types', () => {
            const rules = [
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
            ]

            test('check', () => {
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
                    rules,
                )
                expect(shouldPass).toBeTruthy()
            })

            test('query', () => {
                const result = getRuleQuery(1, rules)
                expect(result).toMatchSnapshot()
            })
        })

        describe('combination of conditional clauses on rules', () => {
            const rules = [
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
            ]

            test('check', () => {
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
                    rules,
                )
                expect(shouldPass).toBeTruthy()
            })

            test('query', () => {
                const result = getRuleQuery(1, rules)
                expect(result).toMatchSnapshot()
            })
        })
    })

    describe('time bound event rules', () => {
        describe('check', () => {
            const rules = [
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
                    frequency: {
                        period: {
                            unit: 'day',
                            value: 7,
                            type: 'rolling',
                        },
                        count: 2,
                        operator: '>=',
                    },
                }),
            ]

            test('if occured more than number of times in period true', () => {
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
                            {
                                name: 'beat-game',
                                score: {
                                    total: 5,
                                    isRecord: true,
                                },
                            },
                        ],
                    },
                    rules,
                )
                expect(shouldPass).toBeTruthy()
            })

            test('if occured less than number of times in period false', () => {
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
                    rules,
                )
                expect(shouldPass).toBeFalsy()
            })

            test('if operator is less than ensure we dont break early', () => {
                const rules = [
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
                        frequency: {
                            period: {
                                unit: 'day',
                                value: 7,
                                type: 'rolling',
                            },
                            count: 1,
                            operator: '<=',
                        },
                    }),
                ]
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
                            {
                                name: 'beat-game',
                                score: {
                                    total: 5,
                                    isRecord: true,
                                },
                            },
                        ],
                    },
                    rules,
                )
                expect(shouldPass).toBeFalsy()
            })
        })
    })
})
