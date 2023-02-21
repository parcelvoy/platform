import { JourneyStepType, Rule, WrapperRule } from '../../../types'
import RuleBuilder, { createWrapperRule } from '../../users/RuleBuilder'

interface GateConfig {
    rule: Rule
}

export const gateStep: JourneyStepType<GateConfig> = {
    name: 'Gate',
    icon: 'bi-layout-split',
    category: 'flow',
    description: 'Only proceed to the next step if a condition passes',
    newData: async () => ({
        rule: createWrapperRule(),
    }),
    Edit({
        onChange,
        value,
    }) {
        return (
            <RuleBuilder
                rule={value.rule as WrapperRule}
                setRule={rule => onChange({ ...value, rule })}
            />
        )
    },
    maxChildren: 1,
}
