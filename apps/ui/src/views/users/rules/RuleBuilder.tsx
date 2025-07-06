import { Rule, ControlledInputProps, FieldProps } from '../../../types'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import './RuleBuilder.css'
import { ReactNode, useCallback, useContext, useMemo } from 'react'
import { ProjectContext } from '../../../contexts'
import { useResolver } from '../../../hooks'
import api from '../../../api'
import { snakeToTitle } from '../../../utils'
import { emptySuggestions, VariablesContext } from './RuleHelpers'
import RuleEdit from './RuleEdit'

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
        <VariablesContext.Provider value={useMemo(() => ({ suggestions: suggestions ?? emptySuggestions }), [suggestions])}>
            <RuleEdit
                root={rule}
                rule={rule}
                setRule={setRule}
                group={eventName ? 'event' : 'parent'}
                eventName={eventName}
                headerPrefix={headerPrefix}
            />
        </VariablesContext.Provider>
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
