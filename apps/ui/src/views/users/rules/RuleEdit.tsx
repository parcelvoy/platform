import FilterRuleEdit from './FilterRuleEdit'
import { isWrapper, RuleEditProps } from './RuleHelpers'
import WrapperRuleEdit from './WrapperRuleEdit'

export default function RuleEdit({ rule, setRule, ...props }: RuleEditProps) {
    if (isWrapper(rule)) {
        return (
            <WrapperRuleEdit rule={rule} setRule={setRule} {...props} />
        )
    }

    return (
        <FilterRuleEdit rule={rule} setRule={setRule} {...props} />
    )
}
