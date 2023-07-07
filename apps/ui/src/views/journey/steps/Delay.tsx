import { JourneyStepType } from '../../../types'
import OptionField from '../../../ui/form/OptionField'
import TextInput from '../../../ui/form/TextInput'
import { DelayStepIcon } from '../../../ui/icons'
import { snakeToTitle } from '../../../utils'

interface DelayStepConfig {
    format: 'duration' | 'time' | 'date'
    minutes: number
    hours: number
    days: number
    time?: string
    date?: string
}

export const delayStep: JourneyStepType<DelayStepConfig> = {
    name: 'Delay',
    icon: <DelayStepIcon />,
    category: 'delay',
    description: 'Add a delay between the previous and next step.',
    newData: async () => ({
        minutes: 0,
        hours: 0,
        days: 0,
        format: 'duration',
    }),
    Edit({
        onChange,
        value,
    }) {
        return (
            <>
                <OptionField name="type" label="Type" options={[
                    { key: 'duration', label: 'For a Duration' },
                    { key: 'time', label: 'Until Time' },
                    { key: 'date', label: 'Until Date' },
                ]}
                value={value.format}
                onChange={format => onChange({ ...value, format }) } />
                { value.format === 'duration'
                    && ['days', 'hours', 'minutes'].map(name => (
                        <TextInput
                            key={name}
                            name={name}
                            label={snakeToTitle(name)}
                            type="number"
                            size="small"
                            min={0}
                            value={value[name as keyof DelayStepConfig] ?? 0}
                            onChange={n => onChange({ ...value, [name]: n })}
                        />
                    ))
                }
                { value.format === 'time'
                    && <TextInput
                        name="time"
                        label="Time"
                        type="time"
                        subtitle="Delay until the specified time in the users timezone."
                        size="small"
                        value={value.time ?? ''}
                        onChange={time => onChange({ ...value, time })}
                    />
                }
                { value.format === 'date'
                    && <TextInput
                        name="date"
                        label="Date"
                        type="text"
                        subtitle="Delay until the specified date in the users timezone."
                        size="small"
                        placeholder="YYYY-MM-DD"
                        value={value.date ?? ''}
                        onChange={date => onChange({ ...value, date })}
                    />
                }
            </>
        )
    },
}
