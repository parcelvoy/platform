import { JourneyStepType } from '../../../types'
import TextInput from '../../../ui/form/TextInput'
import { DelayStepIcon } from '../../../ui/icons'
import { snakeToTitle } from '../../../utils'

interface DelayStepConfig {
    minutes: number
    hours: number
    days: number
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
    }),
    Edit({
        onChange,
        value,
    }) {
        return (
            <>
                {
                    ['days', 'hours', 'minutes'].map(name => (
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
            </>
        )
    },
}
