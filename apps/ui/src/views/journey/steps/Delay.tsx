import { useId } from 'react'
import { JourneyStepType } from '../../../types'

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
        const id = useId()
        return (
            <>
                {
                    ['days', 'hours', 'minutes'].map(name => (
                        <div key={name}>
                            <label htmlFor={id + '-' + name}>{name}</label>
                            <input
                                id={id + '-' + name}
                                type='number'
                                min={0}
                                value={value[name as keyof DelayStepConfig] ?? 0}
                                onChange={e => onChange({ ...value, [name]: parseInt(e.target.value) })}
                            />
                        </div>
                    ))
                }
            </>
        )
    },
}
