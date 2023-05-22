import { JourneyStepType, Rule, WrapperRule } from '../../../types'
import { GateStepIcon } from '../../../ui/icons'
import RuleBuilder, { createWrapperRule } from '../../users/RuleBuilder'

interface GateConfig {
    rule: Rule
}

export const gateStep: JourneyStepType<GateConfig> = {
    name: 'Gate',
    icon: <GateStepIcon />,
    category: 'flow',
    description: 'Proceed on different paths depending on condition results.',
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
                headerPrefix="Does user match "
            />
        )
    },
    sources: ['Yes', 'No'],
}
