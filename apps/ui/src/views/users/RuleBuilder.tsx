import { Operator, Rule, RuleType, WrapperRule } from '../../types'
import Button from '../../ui/Button'
import ButtonGroup from '../../ui/ButtonGroup'
import SelectField from '../../ui/form/SelectField'
import TextField from '../../ui/form/TextField'
import './RuleBuilder.css'

interface RuleSetParams {
    group: WrapperRule
    onChange: (rule: WrapperRule) => void
    onDelete?: () => void
}

export const createWrapperRule = (): WrapperRule => ({
    path: '$',
    type: 'wrapper',
    group: 'user',
    operator: 'and',
    children: [],
})

const RuleSet = ({ group, onChange, onDelete }: RuleSetParams) => {
    // const handleAddGroup = () => {
    //     const newGroup: WrapperRule = {
    //         ...group,
    //         children: [...group.children, {
    //             path: '$',
    //             type: 'wrapper',
    //             group: 'user',
    //             operator: 'and',
    //             children: [],
    //         }],
    //     }
    //     onChange(newGroup)
    // }

    const handleAddUserRule = () => {
        const newGroup: WrapperRule = {
            ...group,
            children: [...group.children ?? [], {
                path: '',
                type: 'string',
                group: 'user',
                value: null,
                operator: '=',
            }],
        }
        onChange(newGroup)
    }

    const handleAddEventRule = () => {
        const newGroup: WrapperRule = {
            ...group,
            children: [...group.children ?? [], {
                path: '$.name',
                type: 'wrapper',
                group: 'event',
                value: 'Event',
                operator: 'and',
                children: [],
            }],
        }
        onChange(newGroup)
    }

    const handleRuleUpdate = (rule: Rule, index: number) => {
        const newGroup: WrapperRule = { ...group }
        newGroup.children[index] = rule
        onChange(newGroup)
    }

    const handleRuleDelete = (index: number) => {
        const newGroup: WrapperRule = {
            ...group,
            children: group.children.filter((_, i) => i !== index),
        }
        onChange(newGroup)
    }

    const handleGroupUpdate = (update: Partial<WrapperRule>) => {
        const newGroup = { ...group, ...update }
        onChange(newGroup)
    }

    const isEvent = group.value
        && group.group === 'event'
        && typeof group.value === 'string'

    return <div className="rule-set">
        {group && <div className="rule-set-header">
            {!onDelete && 'Target all users '}
            {isEvent
                ? <>
                    Did
                    <input
                        className="small"
                        type="text"
                        value={group.value as string}
                        onChange={e => handleGroupUpdate({ value: e.target.value }) } />
                    matching
                </>
                : 'matching'
            }
            <OperatorSelector
                type="wrapper"
                value={group.operator}
                onChange={operator => handleGroupUpdate({ operator })}
            />
            of the following
            {onDelete && <Button
                size="small"
                variant="plain"
                icon="trash"
                onClick={onDelete}
            />}
        </div>}

        <div className="rule-set-rules">
            {group.children?.map((rule, index) => <RuleView
                rule={rule}
                key={index}
                linker={index === 0 ? undefined : group.operator}
                onChange={(rule) => handleRuleUpdate(rule, index)}
                onDelete={() => handleRuleDelete(index)}
            />) }
        </div>

        <div className="rule-set-actions">
            {isEvent
                ? <Button
                    size="small"
                    variant="secondary"
                    icon="plus"
                    onClick={() => handleAddUserRule()}
                >Add Condition</Button>
                : <>
                    <Button
                        size="small"
                        variant="secondary"
                        icon="plus"
                        onClick={() => handleAddUserRule()}
                    >Add User Condition</Button>
                    <Button
                        size="small"
                        variant="secondary"
                        icon="plus"
                        onClick={() => handleAddEventRule()}
                    >Add Event Condition</Button>
                </>
            }
            {/* To be added once rule builder improves */}
            {/* <Button
                variant="plain"
                size="small"
                icon="plus"
                onClick={() => handleAddGroup()}
            >Add Group</Button> */}
        </div>
    </div>
}

interface RuleParams {
    rule: Rule
    linker?: string
    onChange: (rule: Rule) => void
    onDelete: () => void
}

const RuleView = ({ rule, onChange, onDelete }: RuleParams) => {

    const handleUpdate = (value: Partial<Pick<Rule, 'path' | 'operator' | 'value' | 'type'>>) => {
        const newRule: Rule = Object.assign(rule, value)
        onChange(newRule)
    }

    return <div className="rule">
        {rule.type === 'wrapper'
            ? <>
                <RuleSet
                    group={rule}
                    onChange={onChange}
                    onDelete={onDelete} />
            </>
            : <div className="rule-inner">
                <ButtonGroup>
                    <TypeOperator
                        value={rule.type}
                        onChange={type => handleUpdate({ type })}
                    />
                    <TextField
                        size="small"
                        type="text"
                        name="path"
                        placeholder="User Property..."
                        value={rule?.path}
                        onChange={path => handleUpdate({ path })}
                    />
                    <OperatorSelector
                        type={rule.type}
                        value={rule.operator}
                        onChange={operator => handleUpdate({ operator })} />
                    <TextField
                        size="small"
                        type="text"
                        name="value"
                        placeholder="Value"
                        value={rule?.value?.toString()}
                        onChange={value => handleUpdate({ value })}
                    />
                    <Button
                        size="small"
                        icon="trash"
                        variant="secondary"
                        onClick={onDelete} />
                </ButtonGroup>
            </div>
        }
    </div>
}

interface OperatorParams {
    type: RuleType
    value: Operator
    onChange: (operator: Operator) => void
}

const OperatorSelector = ({ type, value, onChange }: OperatorParams) => {
    const baseOperators: OperatorOption[] = [
        { key: '=', label: 'equals' },
        { key: '!=', label: 'does not equal' },
        { key: 'is set', label: 'is set' },
        { key: 'is not set', label: 'is not set' },
    ]

    interface OperatorOption { key: Operator, label: string }
    const types: Record<RuleType, OperatorOption[]> = {
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

    const operators = types[type]

    return <SelectField
        options={operators}
        name="operator"
        size="small"
        value={value}
        onChange={(key) => onChange(key as Operator)} />
}

interface TypeParams {
    value: RuleType
    onChange: (type: RuleType) => void
}

const TypeOperator = ({ value, onChange }: TypeParams) => {
    const types = [
        { key: 'string', label: 'String' },
        { key: 'number', label: 'Number' },
        { key: 'boolean', label: 'Boolean' },
        { key: 'date', label: 'Date' },
        { key: 'array', label: 'Array' },
    ]

    return <SelectField
        options={types}
        name="type"
        size="small"
        value={value}
        onChange={(key) => onChange(key as RuleType)} />
}

interface RuleBuilderParams {
    rule: WrapperRule
    setRule: (rule: WrapperRule) => void
}

export default function RuleBuilder({ rule, setRule }: RuleBuilderParams) {
    return <RuleSet group={rule} onChange={setRule} />
}
