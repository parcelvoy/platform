import { useTranslation } from 'react-i18next'
import RuleEventName from './RuleEventName'
import { ButtonGroup } from '../../../ui'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { EventRule } from '../../../types'
import TextInput from '../../../ui/form/TextInput'
import { frequencyOperators, operatorTypes, periodUnits } from './RuleHelpers'

interface EventRuleEditProps {
    rule: EventRule
    eventName?: string
    setRule: (rule: EventRule) => void
}

export default function EventRuleEdit({
    rule,
    setRule,
    eventName,
}: EventRuleEditProps) {
    const { t } = useTranslation()

    const frequency = rule.frequency ?? {
        period: {
            type: 'rolling',
            unit: 'day',
            value: 30,
        },
        operator: '>=',
        count: 1,
    }

    rule = {
        frequency: {
            period: {
                type: 'rolling',
                unit: 'day',
                value: 30,
            },
            operator: '>=',
            count: 1,
        },
        ...rule,
    }

    // If missing frequency, set default values
    if (!rule.frequency) {
        setRule({
            ...rule,
            frequency,
        })
    }

    if (eventName) {
        if (rule.children?.length) {
            return <>
                {t('rule_matching')}
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
        }
        return <></>
    }

    return <>
        {t('rule_did')}
        <span className="ui-select">
            <RuleEventName
                rule={rule}
                setRule={setRule}
            />
        </span>
        <ButtonGroup className="ui-select frequency-count">
            <SingleSelect
                value={frequency.operator}
                onChange={operator => setRule({
                    ...rule,
                    frequency: {
                        ...rule.frequency ?? frequency,
                        operator,
                    },
                })}
                options={frequencyOperators}
                required
                hideLabel
                size="small"
                toValue={x => x.key}
            />
            <TextInput
                size="tiny"
                type="text"
                name="value"
                placeholder="Count"
                hideLabel={true}
                value={frequency.count?.toString()}
                onChange={count => {
                    setRule({
                        ...rule,
                        frequency: {
                            ...rule.frequency ?? frequency,
                            count: count ? parseInt(count, 10) : undefined,
                        },
                    })
                }}
            />
        </ButtonGroup>
        {'times'}
        {frequency.period.type === 'rolling' && <>
            {' in last'}
            <ButtonGroup className="ui-select frequency-period">
                <TextInput
                    size="tiny"
                    type="text"
                    name="value"
                    placeholder="Value"
                    hideLabel={true}
                    value={frequency.period.value.toString()}
                    onChange={value => {
                        if (frequency.period.type !== 'rolling') return
                        setRule({
                            ...rule,
                            frequency: {
                                ...frequency,
                                period: {
                                    ...frequency.period,
                                    value: parseInt(value, 10) || 1,
                                },
                            },
                        })
                    }}
                />
                <SingleSelect
                    value={frequency.period.unit}
                    onChange={unit => {
                        if (frequency.period.type !== 'rolling') return
                        setRule({
                            ...rule,
                            frequency: {
                                ...frequency,
                                period: {
                                    ...frequency.period,
                                    unit,
                                },
                            },
                        })
                    }}
                    options={periodUnits}
                    required
                    hideLabel
                    size="small"
                    toValue={x => x.key}
                />
            </ButtonGroup>
        </>}
        {
            !!rule.children?.length && <>
                {t('rule_matching')}
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
        }
    </>
}
