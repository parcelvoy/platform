import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { CampaignContext } from '../../contexts'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import { InfoTable } from '../../ui/InfoTable'
import Modal from '../../ui/Modal'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { formatDate } from '../../utils'
import { CampaignForm } from './CampaignForm'
import { CampaignTag } from './Campaigns'
import ChannelTag from './ChannelTag'

export default function CampaignOverview() {

    const [preferences] = useContext(PreferencesContext)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const [isEditOpen, setIsEditOpen] = useState(false)

    return (
        <>
            <Heading
                title="Details"
                size="h3"
                actions={
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setIsEditOpen(true)}
                    >
                        Edit Details
                    </Button>
                }
            />

            <Heading title="Channel" size="h4" />
            <InfoTable rows={{
                channel: ChannelTag({ channel: campaign.channel }),
                provider: campaign.provider.name,
                subscription_group: campaign.subscription.name,
            }} />

            <Heading title="Delivery" size="h4" />
            <InfoTable rows={{
                state: CampaignTag({ state: campaign.state }),
                launched_at: campaign.send_at ? formatDate(preferences, campaign.send_at) : undefined,
                in_timezone: campaign.send_in_user_timezone ? 'Yes' : 'No',
                list: <Link to={`/projects/${campaign.project_id}/lists/${campaign.list_id}`}>{campaign.list?.name}</Link>,
                delivery: `${campaign.delivery?.sent ?? 0} / ${campaign.delivery?.total ?? 0}`,
            }} />
            <Modal
                open={isEditOpen}
                onClose={setIsEditOpen}
                title="Edit Campaign"
                size="large"
            >
                <CampaignForm
                    campaign={campaign}
                    onSave={campaign => {
                        setCampaign(campaign)
                        setIsEditOpen(false)
                    }}
                />
            </Modal>
        </>
    )
}
