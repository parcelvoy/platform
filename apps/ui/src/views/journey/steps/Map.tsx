/* eslint-disable react/prop-types */
import { JourneyStepType } from '../../../types'
import TextField from '../../../ui/form/TextField'

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
        return (
            <TextField
                name="attribute"
                label="Attribute"
                subtitle="Path to value"
                type="text"
                size="small"
                value={value.attribute}
                onChange={attribute => onChange({ ...value, attribute })}
            />
        )
    },
    EditEdge: ({
        stepData,
        siblingData,
        value,
        onChange,
    }) => {
        return (
            <TextField
                name="value"
                label={`When ${stepData.attribute} is:`}
                subtitle={
                    siblingData.find(s => s.value === value.value) && (
                        <span style={{ color: 'red' }}>{'WARNING: duplicate value'}</span>
                    )
                }
                value={value.value || ''}
                onChange={s => onChange({ ...value, value: s })}
            />
        )
    },
}
