/* eslint-disable react/prop-types */
import { useId } from 'react'
import { JourneyStepType } from '../../../types'

interface MapConfig {
    attribute: string
}

export const mapStep: JourneyStepType<MapConfig, { value: string }> = {
    name: 'Map',
    icon: 'bi-arrows-move',
    category: 'flow',
    description: 'Split traffic based on event or user attributes.',
    newData: async () => ({
        attribute: 'example',
    }),
    Edit({
        onChange,
        value,
    }) {
        const id = useId() + '-attribute'
        return (
            <>
                <label htmlFor={id}>
                    Attribute Name
                </label>
                <input
                    id={id}
                    type='text'
                    required
                    value={value.attribute}
                    onChange={e => onChange({ ...value, attribute: e.target.value })}
                />
            </>
        )
    },
    EditEdge: ({
        value,
        onChange,
    }) => {
        return (
            <input
                type='text'
                value={value.value}
                onChange={e => onChange({ ...value, value: e.target.value })}
                required
                aria-label='attribute value'
            />
        )
    },
}
