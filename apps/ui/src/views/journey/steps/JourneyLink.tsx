import { useCallback } from 'react'
import api from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { LinkStepIcon } from '../../../ui/icons'
import { JourneyForm } from '../JourneyForm'

interface JourneyLinkConfig {
    target_id: number
}

export const journeyLinkStep: JourneyStepType<JourneyLinkConfig> = {
    name: 'Link',
    icon: <LinkStepIcon />,
    category: 'action',
    description: 'Send users to another journey.',
    newData: async () => ({ target_id: 0 }),
    Edit({
        value,
        onChange,
        project,
        journey,
    }) {
        return (
            <EntityIdPicker
                label="Target Journey"
                subtitle="Send users to this journey when they reach this step."
                get={useCallback(async id => await api.journeys.get(project.id, id), [project])}
                search={useCallback(async q => await api.journeys.search(project.id, { q, limit: 50 }), [project])}
                optionEnabled={o => o.id !== journey.id}
                value={value.target_id}
                onChange={target_id => onChange({ ...value, target_id })}
                required
                renderCreateForm={onCreated => (
                    <JourneyForm onSaved={onCreated} />
                )}
                onEditLink={journey => window.open(`/projects/${project.id}/journeys/${journey.id}`)}
            />
        )
    },
}
