import { useCallback } from 'react'
import api from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { LinkStepIcon } from '../../../ui/icons'
import { JourneyForm } from '../JourneyForm'
import { useResolver } from '../../../hooks'
import RadioInput from '../../../ui/form/RadioInput'

interface JourneyLinkConfig {
    target_id: number
    delay: '1 minute' | '15 minutes' | '1 hour' | '1 day'
}

export const journeyLinkStep: JourneyStepType<JourneyLinkConfig> = {
    name: 'Link',
    icon: <LinkStepIcon />,
    category: 'action',
    description: 'Send users to another journey.',
    Describe({ project, journey, value: { target_id } }) {
        const [target] = useResolver(useCallback(async () => {
            if (target_id === journey.id) {
                return journey
            }
            if (target_id) {
                return await api.journeys.get(project.id, target_id)
            }
            return null
        }, [project, journey, target_id]))
        if (target === journey) {
            return (
                <>
                    {'Restart '}
                    <strong>{target.name}</strong>
                </>
            )
        }
        if (target) {
            return (
                <>
                    {'Start journey: '}
                    <strong>{target.name}</strong>
                </>
            )
        }
        return <>Send users to &#8211;</>
    },
    newData: async () => ({
        target_id: 0,
        delay: '1 day',
    }),
    Edit({
        value,
        onChange,
        project,
    }) {
        return <>
            <EntityIdPicker
                label="Target Journey"
                subtitle="Send users to this journey when they reach this step."
                get={useCallback(async id => await api.journeys.get(project.id, id), [project])}
                search={useCallback(async q => await api.journeys.search(project.id, { q, limit: 50 }), [project])}
                value={value.target_id}
                onChange={target_id => onChange({ ...value, target_id })}
                required
                renderCreateForm={onCreated => (
                    <JourneyForm onSaved={onCreated} />
                )}
                onEditLink={journey => window.open(`/projects/${project.id}/journeys/${journey.id}`)}
            />
            <RadioInput label="Delay" options={[
                { key: '1 minute', label: '1 Minute' },
                { key: '15 minutes', label: '15 Minutes' },
                { key: '1 hour', label: '1 Hour' },
                { key: '1 day', label: '1 Day' },
            ]}
            value={value.delay}
            onChange={delay => onChange({ ...value, delay }) } />
        </>
    },
}
