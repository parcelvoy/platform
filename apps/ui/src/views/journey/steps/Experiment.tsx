import { useId } from 'react'
import { JourneyStepType } from '../../../types'

interface ExperimentStepChildConfig {
    ratio: number
}

export const experimentStep: JourneyStepType<{}, ExperimentStepChildConfig> = {
    name: 'Experiment',
    icon: 'bi-signpost-split',
    category: 'flow',
    description: 'Randomly send users down different paths.',
    newEdgeData: async () => ({ ratio: 1 }),
    EditEdge({
        onChange,
        value,
    }) {
        const id = useId() + '-ratio'
        return (
            <>
                <label htmlFor={id}>
                    {'Ratio'}
                </label>
                <input
                    type='number'
                    min={0}
                    id={id}
                    value={value.ratio ?? 0}
                    onChange={e => onChange({ ...value, ratio: e.target.valueAsNumber })}
                />
            </>
        )
    },
}
