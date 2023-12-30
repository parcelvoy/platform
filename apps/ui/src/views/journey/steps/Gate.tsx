import { useContext } from 'react'
import { JourneyStepType, Rule } from '../../../types'
import { GateStepIcon } from '../../../ui/icons'
import RuleBuilder, { createWrapperRule, ruleDescription } from '../../users/RuleBuilder'
import { PreferencesContext } from '../../../ui/PreferencesContext'

interface GateConfig {
    rule: Rule
}

export const gateStep: JourneyStepType<GateConfig> = {
    name: 'Gate',
    icon: <GateStepIcon />,
    category: 'flow',
    description: 'Split a user between paths depending on the result of a condition.',
    Describe({
        value,
    }) {
        const [preferences] = useContext(PreferencesContext)
        if (value.rule) {
            return (
                <div style={{ maxWidth: 300 }}>
                    {'Has done '}
                    {ruleDescription(preferences, value.rule, [], value.rule.operator)}
                    {'?'}
                </div>
            )
        }
        return null
    },
    newData: async () => ({
        rule: createWrapperRule(),
    }),
    Edit({
        onChange,
        value,
    }) {
        return (
            <RuleBuilder
                rule={value.rule}
                setRule={rule => onChange({ ...value, rule })}
                headerPrefix="Does user match"
            />
        )
    },
    sources: ['Yes', 'No'],
}
