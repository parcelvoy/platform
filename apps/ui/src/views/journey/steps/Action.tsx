import { useCallback } from 'react'
import api, { apiUrl } from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { ActionStepIcon } from '../../../ui/icons'
import { CampaignForm } from '../../campaign/CampaignForm'
import { useResolver } from '../../../hooks'
import PreviewImage from '../../../ui/PreviewImage'

interface ActionConfig {
    campaign_id: number
}

export const actionStep: JourneyStepType<ActionConfig> = {
    name: 'Send',
    icon: <ActionStepIcon />,
    category: 'action',
    description: 'Trigger a send (email, sms, push notification, webhook) to a user.',
    Describe({
        project: { id: projectId },
        value: {
            campaign_id,
        },
    }) {

        const [campaign] = useResolver(useCallback(async () => {
            if (campaign_id) {
                return await api.campaigns.get(projectId, campaign_id)
            }
            return null
        }, [projectId, campaign_id]))

        if (campaign) {
            return (
                <>
                    <div className="journey-step-body-name">{campaign.name}</div>
                    {
                        campaign.channel !== 'webhook' && (
                            <PreviewImage
                                url={apiUrl(projectId, `campaigns/${campaign.id}/preview`)}
                                width={200}
                                height={200}
                            />
                        )
                    }
                </>
            )
        }

        return null
    },
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
                search={useCallback(async q => await api.campaigns.search(projectId, { q, limit: 50 }), [projectId])}
                value={value.campaign_id}
                onChange={campaign_id => onChange({ ...value, campaign_id })}
                required
                createModalSize="large"
                renderCreateForm={onCreated => (
                    <CampaignForm
                        type="trigger"
                        onSave={onCreated}
                    />
                )}
                onEditLink={campaign => window.open(`/projects/${projectId}/campaigns/${campaign.id}`)}
            />
        )
    },
    hasDataKey: true,
}
