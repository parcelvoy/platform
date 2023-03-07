import { useCallback } from 'react'
import api from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'

interface ActionConfig {
    campaign_id: number
}

export const actionStep: JourneyStepType<ActionConfig> = {
    name: 'Action',
    icon: 'bi-lightning-fill',
    category: 'action',
    description: 'Trigger a message (email, sms, push notification, webhook) to be sent.',
    newData: async () => ({
        campaign_id: 0,
    }),
    Edit({
        project: { id: projectId },
        onChange,
        value,
    }) {
        return (
            <>
                <EntityIdPicker
                    label="Campaign"
                    get={useCallback(async id => await api.campaigns.get(projectId, id), [projectId])}
                    search={useCallback(async q => await api.campaigns.search(projectId, { q, page: 0, itemsPerPage: 50 }), [projectId])}
                    value={value.campaign_id}
                    onChange={campaign_id => onChange({ ...value, campaign_id })}
                    required
                />
            </>
        )
    },
    maxChildren: 1,
}
