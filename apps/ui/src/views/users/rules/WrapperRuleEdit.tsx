import { useTranslation } from 'react-i18next'
import { Button } from '../../../ui'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { PlusIcon, TrashIcon } from '../../../ui/icons'
import { createUuid } from '../../../utils'
import EventRuleEdit from './EventRuleEdit'
import { createEventRule, isEventWrapper, operatorTypes, RuleEditProps } from './RuleHelpers'
import { EventRule, WrapperRule } from '../../../types'
import RuleEdit from './RuleEdit'

export default function WrapperRuleEdit({
    rule,
    root,
    setRule,
    controls,
    depth = 0,
    eventName = '',
}: RuleEditProps<WrapperRule>) {
    const { t } = useTranslation()

    const handleAddEventWrapper = () => {
        const children = rule.children ?? []
        const newRule: EventRule = createEventRule(rule)
        setRule({
            ...rule,
            children: [
                ...children,
                newRule,
            ],
        })
    }

    let ruleSet = (
        <div className="rule-set">
            <div className="rule-set-header">
                {isEventWrapper(rule)
                    ? (
                        <EventRuleEdit
                            rule={rule}
                            setRule={setRule}
                            eventName={eventName} />
                    )
                    : (
                        <>
                            {t('rule_include_users_matching')}
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
                            onClick={() => handleAddEventWrapper()}
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
