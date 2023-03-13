import { useCallback } from 'react'
import api from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { ActionStepIcon } from '../../../ui/icons'
import { CampaignForm } from '../../campaign/CampaignForm'

interface ActionConfig {
    campaign_id: number
}

export const actionStep: JourneyStepType<ActionConfig> = {
    name: 'Action',
    icon: <ActionStepIcon />,
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
            <EntityIdPicker
                label="Campaign"
                subtitle="Send this campaign when users reach this step."
                get={useCallback(async id => await api.campaigns.get(projectId, id), [projectId])}
                search={useCallback(async q => await api.campaigns.search(projectId, { q, page: 0, itemsPerPage: 50 }), [projectId])}
                value={value.campaign_id}
                onChange={campaign_id => onChange({ ...value, campaign_id })}
                required
                createModalSize="large"
                renderCreateForm={onCreated => (
                    <CampaignForm
                        disableListSelection
                        onSave={onCreated}
                    />
                )}
                onEditLink={campaign => window.open(`/projects/${projectId}/campaigns/${campaign.id}`)}
            />
        )
    },
}
