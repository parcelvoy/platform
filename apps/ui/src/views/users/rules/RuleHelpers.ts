import { createContext, ReactNode } from 'react'
import { EventRule, Operator, Rule, RuleGroup, RuleSuggestions, RuleType, WrapperRule } from '../../../types'
import { createUuid } from '../../../utils'

export interface GroupedRule extends Omit<Rule, 'value'> {
    value?: string | string[]
}

export const trimPathDisplay = (path: string = '') => path.startsWith('$.') ? path.substring(2) : path

export const isEventWrapper = (rule: Rule): rule is EventRule => {
    return rule.group === 'event'
        && (rule.path === '$.name' || rule.path === 'name')
}

export const isWrapper = (rule: Rule | GroupedRule): rule is WrapperRule => {
    return rule.type === 'wrapper'
        && (rule.group === 'parent' || rule.group === 'event')
}

export const createWrapperRule = (): WrapperRule => ({
    uuid: createUuid(),
    path: '$',
    type: 'wrapper',
    group: 'parent',
    operator: 'and',
    children: [],
})

export const createEventRule = (parent?: Rule): EventRule => {
    const base: EventRule = {
        uuid: createUuid(),
        path: '$.name',
        type: 'wrapper',
        group: 'event',
        value: '',
        operator: 'and',
        children: [],
        frequency: {
            period: {
                type: 'rolling',
                unit: 'day',
                value: 30,
            },
            operator: '>=',
            count: 1,
        },
    }
    if (parent) {
        return {
            ...base,
            root_uuid: parent.root_uuid ?? parent.uuid,
            parent_uuid: parent.uuid,
        }
    }
    return base
}

export const emptySuggestions = {
    userPaths: [],
    eventPaths: {},
}

export const RuleEditContext = createContext<{
    suggestions: RuleSuggestions
}>({
    suggestions: emptySuggestions,
})

export const ruleTypes: Array<{
    key: RuleType
    label: string
}> = [
    { key: 'string', label: 'String' },
    { key: 'number', label: 'Number' },
    { key: 'boolean', label: 'Boolean' },
    { key: 'date', label: 'Date' },
    { key: 'array', label: 'Array' },
]

const baseOperators: OperatorOption[] = [
    { key: '=', label: 'equals' },
    { key: '!=', label: 'does not equal' },
    { key: 'is set', label: 'is set' },
    { key: 'is not set', label: 'is not set' },
]

interface OperatorOption {
    key: Operator
    label: string
}

export const operatorTypes: Record<RuleType, OperatorOption[]> = {
    string: [
        ...baseOperators,
        { key: 'empty', label: 'is empty' },
        { key: 'contains', label: 'contains' },
        { key: 'not contain', label: 'does not contain' },
        { key: 'starts with', label: 'starts with' },
        { key: 'not start with', label: 'does not start with' },
    ],
    number: [
        ...baseOperators,
        { key: '<', label: 'is less than' },
        { key: '<=', label: 'is less than or equal to' },
        { key: '>', label: 'is greater than' },
        { key: '>=', label: 'is greater than or equal to' },
    ],
    boolean: [
        { key: '=', label: 'is' },
        { key: '!=', label: 'is not' },
    ],
    date: [
        ...baseOperators,
        { key: '<', label: 'is before' },
        { key: '<=', label: 'is on or before' },
        { key: '>', label: 'is after' },
        { key: '>=', label: 'is on or after' },
    ],
    array: [
        ...baseOperators,
        { key: 'empty', label: 'is empty' },
        { key: 'contains', label: 'contains' },
    ],
    wrapper: [
        { key: 'or', label: 'any' },
        { key: 'and', label: 'all' },
    ],
}

export const frequencyOperators: OperatorOption[] = [
    { key: '=', label: 'Exactly' },
    { key: '<', label: 'Less than' },
    { key: '<=', label: 'Less than or equal to' },
    { key: '>', label: 'Greater than' },
    { key: '>=', label: 'Greater than or equal to' },
]

export const periodUnits: Array<{ key: 'minute' | 'hour' | 'day' | 'week' | 'month', label: string }> = [
    { key: 'minute', label: 'Minutes' },
    { key: 'hour', label: 'Hours' },
    { key: 'day', label: 'Days' },
    { key: 'week', label: 'Weeks' },
    { key: 'month', label: 'Months' },
]

export interface RuleEditProps<T extends Rule = Rule> {
    rule: T
    root: Rule
    setRule: (value: T) => void
    group: RuleGroup
    eventName?: string
    depth?: number
    controls?: ReactNode
    headerPrefix?: ReactNode
}
