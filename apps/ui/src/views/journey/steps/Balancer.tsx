import { JourneyStepType } from '../../../types'
import RadioInput from '../../../ui/form/RadioInput'
import TextInput from '../../../ui/form/TextInput'
import { BalancerStepIcon } from '../../../ui/icons'
import { useTranslation } from 'react-i18next'

interface BalancerStepChildConfig {
    rate_limit?: number
    rate_interval?: 'second' | 'minute' | 'hour' | 'day'
}

export const balancerStep: JourneyStepType<BalancerStepChildConfig> = {
    name: 'balancer',
    icon: <BalancerStepIcon />,
    category: 'flow',
    description: 'balancer_desc',
    Describe: ({ value }) => {
        const { t } = useTranslation()
        if (!value.rate_limit) return <>{t('balancer_desc_empty')}</>
        return <div style={{ maxWidth: 300 }}>{t('balancer_desc_values', { ...value })}</div>
    },
    newData: async () => ({
        rate_limit: 0,
        rate_interval: 'minute',
    }),
    Edit: ({
        onChange,
        value,
    }) => {
        const { t } = useTranslation()
        return (
            <div style={{ maxWidth: 300 }}>
                {t('balancer_edit_desc')}

                <RadioInput label={t('period')} options={[
                    { key: 'second', label: t('second') },
                    { key: 'minute', label: t('minute') },
                    { key: 'hour', label: t('hour') },
                    { key: 'day', label: t('day') },
                ]}
                value={value.rate_interval}
                onChange={rate_interval => onChange({ ...value, rate_interval }) } />

                <TextInput
                    name="rate_limit"
                    label={t('rate_limit')}
                    type="number"
                    size="small"
                    value={value.rate_limit}
                    onChange={rate_limit => onChange({ ...value, rate_limit })}
                />
            </div>
        )
    },
    multiChildSources: true,
}
