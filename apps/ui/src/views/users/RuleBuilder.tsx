import { Combobox } from '@headlessui/react'
import { Operator, Rule, RuleSuggestions, RuleType, WrapperRule, ControlledInputProps, FieldProps, Preferences, RuleGroup } from '../../types'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
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
import { createUuid, formatDate, snakeToTitle } from '../../utils'
import { useTranslation } from 'react-i18next'

export const createWrapperRule = (): WrapperRule => ({
    uuid: createUuid(),
    path: '$',
    type: 'wrapper',
    group: 'parent',
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
        { key: 'none', label: 'none' },
        { key: 'xor', label: 'only one' },
    ],
}

interface GroupedRule extends Omit<Rule, 'value'> {
    value?: string | string[]
}

const trimPathDisplay = (path: string = '') => path.startsWith('$.') ? path.substring(2) : path

export function ruleDescription(preferences: Preferences, rule: Rule | GroupedRule, nodes: ReactNode[] = [], wrapperOperator?: Operator): ReactNode {
    const root = nodes.length === 0
    if (rule.type === 'wrapper') {
        if (rule.group === 'event' && (rule.path === '$.name' || rule.path === 'name')) {
            if (!root) {
                nodes.push(
                    'has user done ',
                    <strong key={nodes.length}>
                        {rule.value ?? ''}
                    </strong>,
                )
            } else {
                nodes.push(
                    <strong key={nodes.length}>
                        {rule.value ?? ''}
                    </strong>,
                )
            }
            if (rule.children?.length) {
                nodes.push(' where ')
            }
        }
        if (rule.children?.length) {
            const grouped: GroupedRule[] = []
            for (const child of rule.children) {
                if (child.type === 'wrapper') {
                    grouped.push(child)
                    continue
                }
                const path = trimPathDisplay(child.path)
                const prev = grouped.find(g => trimPathDisplay(g.path) === path && g.operator === child.operator)
                if (prev) {
                    if (Array.isArray(prev.value)) {
                        prev.value.push(child.value ?? '')
                    } else {
                        prev.value = [prev.value ?? '', child.value ?? '']
                    }
                } else {
                    grouped.push({ ...child }) // copy so we don't modify original
                }
            }
            grouped.forEach((g, i) => {
                if (i > 0) {
                    nodes.push(', ')
                    if (wrapperOperator) {
                        nodes.push(rule.operator === 'and' ? 'and ' : 'or ')
                    }
                }
                ruleDescription(preferences, g, nodes, rule.operator)
            })
        }
    } else {
        if (rule.group === 'event' && (rule.path === '$.name' || rule.path === 'name')) {
            nodes.push('event ')
        }
        if (rule.group === 'user') {
            nodes.push('user property ')
        }

        nodes.push(
            <code key={nodes.length}>
                {trimPathDisplay(rule.path)}
            </code>,
        )

        nodes.push(' ' + (operatorTypes[rule.type]?.find(ot => ot.key === rule.operator)?.label ?? rule.operator))

        if (rule.operator !== 'empty' && rule.operator !== 'is set' && rule.operator !== 'is not set') {
            nodes.push(' ')
            const values = Array.isArray(rule.value) ? rule.value : [rule.value ?? '']
            values.forEach((value, i, a) => {
                if (i > 0) {
                    nodes.push(', ')
                    if (i === a.length - 1 && wrapperOperator) {
                        nodes.push(wrapperOperator === 'and' ? 'and ' : 'or ')
                    }
                }
                if (value.includes('{{')) {
                    nodes.push(
                        <code key={nodes.length}>
                            {value}
                        </code>,
                    )
                } else {
                    value = value.trim()
                    if (rule.type === 'boolean') value = 'true'
                    if (rule.type === 'number') {
                        try {
                            if (value.includes('.')) {
                                value = parseFloat(value).toLocaleString()
                            } else {
                                value = parseInt(value, 10).toLocaleString()
                            }
                        } catch {}
                    }
                    if (rule.type === 'date') {
                        try {
                            value = formatDate(preferences, value, 'Ppp')
                        } catch {}
                    }
                    nodes.push(
                        <strong key={nodes.length}>
                            {value}
                        </strong>,
                    )
                }
            })
        }
    }
    if (root) {
        return (
            <span className="rule-describe">
                {nodes}
            </span>
        )
    }
    return nodes
}

interface RuleEditProps {
    rule: Rule
    root: Rule
    setRule: (value: Rule) => void
    group: RuleGroup
    eventName?: string
    depth?: number
    controls?: ReactNode
    headerPrefix?: ReactNode
}

function RuleEdit({
    controls,
    depth = 0,
    eventName = '',
    group,
    headerPrefix,
    root,
    rule,
    setRule,
}: RuleEditProps) {

    const {
        setReferenceElement,
        setPopperElement,
        attributes,
        styles,
    } = usePopperSelectDropdown()

    const { t } = useTranslation()
    const { suggestions } = useContext(RuleEditContext)
    const { path } = rule
    const hasValue = rule?.operator && !['is set', 'is not set', 'empty'].includes(rule?.operator)
    headerPrefix = headerPrefix ?? t('rule_include_users_matching')

    const pathSuggestions = useMemo<string[]>(() => {

        let paths = (
            group === 'event'
                ? [
                    ...(eventName ? suggestions.eventPaths[eventName] ?? [] : []),
                    '$.name',
                ]
                : [
                    ...suggestions.userPaths,
                    '$.id',
                    '$.email',
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
                        (rule.group === 'event' && !eventName)
                            ? (
                                <>
                                    {t('rule_did')}
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
                                                className="select-options nowheel"
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
                                    {
                                        !!rule.children?.length && t('rule_matching')
                                    }
                                </>
                            )
                            : headerPrefix
                    }
                    {
                        Boolean(rule.group === 'user' || rule.group === 'parent' || rule.children?.length) && (
                            <>
                                <SingleSelect
                                    value={rule.operator}
                                    onChange={operator => setRule({ ...rule, operator })}
                                    options={operatorTypes.wrapper}
                                    required
                                    hideLabel
                                    size="small"
                                    toValue={x => x.key}
                                />
                                {t('rule_of_the_following')}
                            </>
                        )
                    }
                    <div style={{ flexGrow: 1 }} />
                    {controls}
                </div>
                <div className="rule-set-rules">
                    {
                        rule.children?.map((child, index, arr) => (
                            <RuleEdit
                                key={index}
                                root={root}
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
                                uuid: createUuid(),
                                root_uuid: root.uuid,
                                parent_uuid: rule.uuid,
                                path: '',
                                type: 'string',
                                group: rule.group === 'event' ? 'event' : 'user',
                                value: '',
                                operator: '=',
                            }],
                        })}
                    >
                        {
                            rule.group === 'event'
                                ? t('rule_add_condition')
                                : t('rule_add_user_condition')
                        }
                    </Button>
                    {
                        (depth === 0 && (rule.group === 'user' || rule.group === 'parent')) && (
                            <Button
                                size="small"
                                variant="secondary"
                                icon={<PlusIcon />}
                                onClick={() => setRule({
                                    ...rule,
                                    children: [...rule.children ?? [], {
                                        uuid: createUuid(),
                                        root_uuid: root.uuid,
                                        parent_uuid: rule.uuid,
                                        path: '$.name',
                                        type: 'wrapper',
                                        group: 'event',
                                        value: '',
                                        operator: 'and',
                                        children: [],
                                    }],
                                })}
                            >
                                {t('rule_add_event_condition')}
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
                        className="select-options nowheel"
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
                    toValue={x => x.key}
                />
                { hasValue && <TextInput
                    size="small"
                    type="text"
                    name="value"
                    placeholder="Value"
                    disabled={rule.type === 'boolean'}
                    hideLabel={true}
                    value={rule.type === 'boolean' ? 'true' : rule?.value?.toString()}
                    onChange={value => setRule({ ...rule, value })}
                />}
                {controls}
            </ButtonGroup>
        </div>
    )
}

interface RuleBuilderParams {
    rule: Rule
    setRule: (rule: Rule) => void
    headerPrefix?: ReactNode
    eventName?: string
}

export default function RuleBuilder({ eventName, headerPrefix, rule, setRule }: RuleBuilderParams) {
    const [{ id: projectId }] = useContext(ProjectContext)
    const [suggestions] = useResolver(useCallback(async () => await api.projects.pathSuggestions(projectId), [projectId]))
    return (
        <RuleEditContext.Provider value={useMemo(() => ({ suggestions: suggestions ?? emptySuggestions }), [suggestions])}>
            <RuleEdit
                root={rule}
                rule={rule}
                setRule={setRule}
                group={eventName ? 'event' : 'parent'}
                eventName={eventName}
                headerPrefix={headerPrefix}
            />
        </RuleEditContext.Provider>
    )
}

RuleBuilder.Field = function RuleBuilderField<X extends FieldValues, P extends FieldPath<X>>({
    form,
    name,
    label,
    required,
    onChange,
}: Partial<ControlledInputProps<Rule>> & FieldProps<X, P>) {

    const { field } = useController({
        control: form.control,
        name,
        rules: {
            required,
        },
    })

    return <>
        <div className="rule-form-title">
            <span>
                {label ?? snakeToTitle(name)}
                {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
            </span>
        </div>
        <RuleBuilder rule={field.value} setRule={async (rule) => {
            await field.onChange?.(rule)
            onChange?.(rule)
        }} />
    </>
}
