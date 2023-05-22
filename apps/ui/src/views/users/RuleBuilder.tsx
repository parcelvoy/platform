import { Combobox } from '@headlessui/react'
import { Operator, Rule, RuleSuggestions, RuleType, WrapperRule } from '../../types'
import Button from '../../ui/Button'
import ButtonGroup from '../../ui/ButtonGroup'
import { SingleSelect } from '../../ui/form/SingleSelect'
import TextInput from '../../ui/form/TextInput'
import { ChevronUpDownIcon, PlusIcon, TrashIcon } from '../../ui/icons'
import './RuleBuilder.css'
import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react'
import { ProjectContext } from '../../contexts'
import { useResolver } from '../../hooks'
import api from '../../api'
import { highlightSearch, usePopperSelectDropdown } from '../../ui/utils'
import clsx from 'clsx'

export const createWrapperRule = (): WrapperRule => ({
    path: '$',
    type: 'wrapper',
    group: 'user',
    operator: 'and',
    children: [],
})

const emptySuggestions = {
    userPaths: [],
    eventPaths: {},
}

const RuleEditContext = createContext<{
    suggestions: RuleSuggestions
}>({
    suggestions: emptySuggestions,
})

const ruleTypes: Array<{
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

const operatorTypes: Record<RuleType, OperatorOption[]> = {
    string: [
        ...baseOperators,
        { key: 'empty', label: 'is empty' },
        { key: 'contains', label: 'contains' },
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

interface RuleEditProps {
    rule: Rule
    setRule: (value: Rule) => void
    group: 'user' | 'event'
    eventName?: string
    depth?: number
    controls?: ReactNode
    headerPrefix?: string
}

function RuleEdit({
    controls,
    depth = 0,
    eventName = '',
    group,
    headerPrefix = 'Include users matching ',
    rule,
    setRule,
}: RuleEditProps) {

    const {
        setReferenceElement,
        setPopperElement,
        attributes,
        styles,
    } = usePopperSelectDropdown()

    const { suggestions } = useContext(RuleEditContext)

    const { path } = rule

    const pathSuggestions = useMemo<string[]>(() => {

        let paths = (
            group === 'event'
                ? [
                    ...(eventName ? suggestions.eventPaths[eventName] ?? [] : []),
                    '$.name',
                ]
                : [
                    ...suggestions.userPaths,
                    '$.email',
                    '$.external_id',
                    '$.phone',
                    '$.timezone',
                    '$.locale',
                ]
        ).filter((p, i, a) => a.indexOf(p) === i).sort()

        if (path) {
            let search = path.toLowerCase()
            if (search.startsWith('.')) search = '$' + search
            if (!search.startsWith('$.')) search = '$.' + search
            paths = paths.filter(p => p.toLowerCase().startsWith(search))
        }

        return paths
    }, [suggestions, group, eventName, path])

    if (rule.type === 'wrapper') {

        let ruleSet = (
            <div className="rule-set">
                <div className="rule-set-header">
                    {
                        rule.group === 'event'
                            ? (
                                <>
                                    Did
                                    <span className="ui-select">
                                        <Combobox onChange={(value: string) => setRule({ ...rule, value })}>
                                            <ButtonGroup>
                                                <span className="ui-text-input">
                                                    <Combobox.Input
                                                        value={rule.value ?? ''}
                                                        onChange={e => setRule({ ...rule, value: e.target.value })}
                                                        required
                                                        className="small"
                                                        ref={setReferenceElement}
                                                    />
                                                </span>
                                                <Combobox.Button className="ui-button secondary small">
                                                    <ChevronUpDownIcon />
                                                </Combobox.Button>
                                            </ButtonGroup>
                                            <Combobox.Options
                                                className="select-options"
                                                ref={setPopperElement}
                                                style={styles.popper}
                                                {...attributes.popper}
                                            >
                                                {
                                                    Object.keys(suggestions.eventPaths)
                                                        .sort()
                                                        .filter(eventName => !rule.value || eventName.toLowerCase().startsWith(rule.value.toLowerCase()))
                                                        .map(eventName => (
                                                            <Combobox.Option
                                                                key={eventName}
                                                                value={eventName}
                                                                className={({ active, selected }) => clsx('select-option', active && 'active', selected && 'selected')}
                                                            >
                                                                <span
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: highlightSearch(eventName, rule.value ?? ''),
                                                                    }}
                                                                />
                                                            </Combobox.Option>
                                                        ))
                                                }
                                            </Combobox.Options>
                                        </Combobox>
                                    </span>
                                </>
                            )
                            : headerPrefix
                    }
                    <SingleSelect
                        value={rule.operator}
                        onChange={operator => setRule({ ...rule, operator })}
                        options={operatorTypes.wrapper}
                        required
                        hideLabel
                        size="small"
                    />
                    of the following
                    {controls}
                </div>
                <div className="rule-set-rules">
                    {
                        rule.children?.map((child, index, arr) => (
                            <RuleEdit
                                key={index}
                                rule={child}
                                setRule={child => setRule({
                                    ...rule,
                                    children: rule.children?.map((c, i) => i === index ? child : c),
                                })}
                                group={rule.group}
                                eventName={rule.value}
                                depth={depth + 1}
                                controls={
                                    <Button
                                        size="small"
                                        icon={<TrashIcon />}
                                        variant="secondary"
                                        onClick={() => setRule({
                                            ...rule,
                                            children: arr.filter((_, i) => i !== index),
                                        })}
                                    />
                                }
                            />
                        ))
                    }
                </div>
                <div className="rule-set-actions">
                    <Button
                        size="small"
                        variant="secondary"
                        icon={<PlusIcon />}
                        onClick={() => setRule({
                            ...rule,
                            children: [...rule.children ?? [], {
                                path: '',
                                type: 'string',
                                group: 'user',
                                value: '',
                                operator: '=',
                            }],
                        })}
                    >
                        {
                            rule.group === 'event'
                                ? 'Add Condition'
                                : 'Add User Condition'
                        }
                    </Button>
                    {
                        depth === 0 && (
                            <Button
                                size="small"
                                variant="secondary"
                                icon={<PlusIcon />}
                                onClick={() => setRule({
                                    ...rule,
                                    children: [...rule.children ?? [], {
                                        path: '',
                                        type: 'wrapper',
                                        group: 'event',
                                        value: '',
                                        operator: 'and',
                                        children: [],
                                    }],
                                })}
                            >
                                Add Event Condition
                            </Button>
                        )
                    }
                </div>
            </div>
        )

        if (depth > 0) {
            ruleSet = (
                <div className="rule">
                    {ruleSet}
                </div>
            )
        }

        return ruleSet
    }

    return (
        <div className="rule">
            <ButtonGroup className="ui-select">
                <SingleSelect
                    value={rule.type}
                    onChange={type => setRule({ ...rule, type })}
                    options={ruleTypes}
                    required
                    hideLabel
                    size="small"
                    toValue={x => x.key as typeof rule.type}
                />
                <Combobox onChange={(path: string) => setRule({ ...rule, path })}>
                    <span className="ui-text-input">
                        <Combobox.Input
                            value={rule.path}
                            onChange={e => setRule({ ...rule, path: e.target.value })}
                            required
                            ref={setReferenceElement}
                            className="small"
                        />
                    </span>
                    <Combobox.Button className="ui-button small secondary">
                        <ChevronUpDownIcon />
                    </Combobox.Button>
                    <Combobox.Options
                        className="select-options"
                        ref={setPopperElement}
                        style={styles.popper}
                        {...attributes.popper}
                    >
                        {
                            pathSuggestions.map(s => (
                                <Combobox.Option
                                    key={s}
                                    value={s}
                                    className={({ active, selected }) => clsx('select-option', active && 'active', selected && 'selected')}
                                >
                                    <span
                                        dangerouslySetInnerHTML={{
                                            __html: highlightSearch(s, rule.path),
                                        }}
                                    />
                                </Combobox.Option>
                            ))
                        }
                    </Combobox.Options>
                </Combobox>
                <SingleSelect
                    value={rule.operator}
                    onChange={operator => setRule({ ...rule, operator })}
                    options={operatorTypes[rule.type] ?? []}
                    required
                    hideLabel
                    size="small"
                />
                <TextInput
                    size="small"
                    type="text"
                    name="value"
                    placeholder="Value"
                    hideLabel={true}
                    value={rule?.value?.toString()}
                    onChange={value => setRule({ ...rule, value })}
                />
                {controls}
            </ButtonGroup>
        </div>
    )
}

interface RuleBuilderParams {
    rule: Rule
    setRule: (rule: Rule) => void
    headerPrefix?: string
}

export default function RuleBuilder({ headerPrefix, rule, setRule }: RuleBuilderParams) {
    const [{ id: projectId }] = useContext(ProjectContext)
    const [suggestions] = useResolver(useCallback(async () => await api.projects.pathSuggestions(projectId), [projectId]))
    return (
        <RuleEditContext.Provider value={useMemo(() => ({ suggestions: suggestions ?? emptySuggestions }), [suggestions])}>
            <RuleEdit
                rule={rule}
                setRule={setRule}
                group="user"
                headerPrefix={headerPrefix}
            />
        </RuleEditContext.Provider>
    )
}
