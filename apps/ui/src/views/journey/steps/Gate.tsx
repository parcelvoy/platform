import { useContext } from 'react'
import { JourneyStepType, Rule } from '../../../types'
import { GateStepIcon } from '../../../ui/icons'
import RuleBuilder, { createWrapperRule, ruleDescription } from '../../users/RuleBuilder'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import { useTranslation } from 'react-i18next'

interface GateConfig {
    rule: Rule
}

export const gateStep: JourneyStepType<GateConfig> = {
    name: 'gate',
    icon: <GateStepIcon />,
    category: 'flow',
    description: 'gate_desc',
    Describe({
        value,
    }) {
        const { t } = useTranslation()
        const [preferences] = useContext(PreferencesContext)
        if (value.rule) {
            return (
                <div style={{ maxWidth: 300 }}>
                    {t('has_done') + ' '}
                    {ruleDescription(preferences, value.rule, [], value.rule.operator)}
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
        const { t } = useTranslation()
        return (
            <RuleBuilder
                rule={value.rule}
                setRule={rule => onChange({ ...value, rule })}
                headerPrefix={t('does_user_match')}
            />
        )
    },
    sources: ['yes', 'no'],
}
