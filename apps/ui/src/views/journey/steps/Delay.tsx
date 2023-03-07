import { JourneyStepType } from '../../../types'
import TextField from '../../../ui/form/TextField'
import { snakeToTitle } from '../../../utils'

interface DelayStepConfig {
    minutes: number
    hours: number
    days: number
}

export const delayStep: JourneyStepType<DelayStepConfig> = {
    name: 'Delay',
    icon: 'bi-clock-fill',
    category: 'delay',
    description: 'Add a delay between the previous and next step.',
    newData: async () => ({
        minutes: 0,
        hours: 0,
        days: 0,
    }),
    Edit({
        onChange,
        value,
    }) {
        return (
            <>
                {
                    ['days', 'hours', 'minutes'].map(name => (
                        <TextField
                            key={name}
                            name={name}
                            label={snakeToTitle(name)}
                            type="number"
                            size="small"
                            min={0}
                            value={value[name as keyof DelayStepConfig] ?? 0}
                            onChange={n => onChange({ ...value, [name]: parseInt(n) })}
                        />
                    ))
                }
            </>
        )
    },
    maxChildren: 1,
}
