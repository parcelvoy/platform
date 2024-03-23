import { useCallback } from 'react'
import api from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { LinkStepIcon } from '../../../ui/icons'
import { JourneyForm } from '../JourneyForm'
import { useResolver } from '../../../hooks'
import RadioInput from '../../../ui/form/RadioInput'
import { useTranslation } from 'react-i18next'

interface JourneyLinkConfig {
    target_id: number
    delay: '1 minute' | '15 minutes' | '1 hour' | '1 day'
}

export const journeyLinkStep: JourneyStepType<JourneyLinkConfig> = {
    name: 'link',
    icon: <LinkStepIcon />,
    category: 'action',
    description: 'link_desc',
    Describe({ project, journey, value: { target_id } }) {
        const { t } = useTranslation()
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
            return <>
                {t('restart') + ' '}
                <strong>{target.name}</strong>
            </>
        }
        if (target) {
            return <>
                {t('start_journey')}
                <strong>{target.name}</strong>
            </>
        }
        return <>{t('link_empty')} &#8211;</>
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
        const { t } = useTranslation()
        return <>
            <EntityIdPicker
                label={t('target_journey')}
                subtitle={t('target_journey_desc')}
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
            <RadioInput label={t('delay')} options={[
                { key: '1 minute', label: t('minute', { count: 1 }) },
                { key: '15 minutes', label: t('minute', { count: 15 }) },
                { key: '1 hour', label: t('hour', { count: 1 }) },
                { key: '1 day', label: t('day', { count: 1 }) },
            ]}
            value={value.delay}
            onChange={delay => onChange({ ...value, delay }) } />
        </>
    },
}
