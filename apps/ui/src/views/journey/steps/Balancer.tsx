import { JourneyStepType } from '../../../types'
import OptionField from '../../../ui/form/OptionField'
import TextInput from '../../../ui/form/TextInput'
import { BalancerStepIcon } from '../../../ui/icons'

interface BalancerStepChildConfig {
    rate_limit?: number
    rate_interval?: 'second' | 'minute' | 'hour' | 'day'
}

export const balancerStep: JourneyStepType<BalancerStepChildConfig> = {
    name: 'Balancer',
    icon: <BalancerStepIcon />,
    category: 'flow',
    description: 'Randomly split users across paths and rate limit traffic.',
    Describe: ({ value }) => {
        if (!value.rate_limit) return <>Randomly split users between paths</>
        return <div style={{ maxWidth: 300 }}>{`Randomly split users between paths. Allow up to ${value.rate_limit} users per ${value.rate_interval} to go down each path before throttling.`}</div>
    },
    newData: async () => ({
        rate_limit: 0,
        rate_interval: 'minute',
    }),
    Edit: ({
        onChange,
        value,
    }) => (
        <div style={{ maxWidth: 300 }}>
            Randomly split users across paths. Configure an optional rate limit to limit the number of users that go down a path over a given time period.

            <OptionField name="rate_interval" label="Period" options={[
                { key: 'second', label: 'Second' },
                { key: 'minute', label: 'Minute' },
                { key: 'hour', label: 'hour' },
                { key: 'day', label: 'day' },
            ]}
            value={value.rate_interval}
            onChange={rate_interval => onChange({ ...value, rate_interval }) } />

            <TextInput
                name="rate_limit"
                label="Rate Limit"
                type="number"
                size="small"
                value={value.rate_limit}
                onChange={rate_limit => onChange({ ...value, rate_limit })}
            />
        </div>
    ),
    sources: 'multi',
}
