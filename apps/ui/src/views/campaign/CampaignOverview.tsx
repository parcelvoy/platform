import { ReactNode, useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { CampaignContext, ProjectContext } from '../../contexts'
import { List } from '../../types'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import { InfoTable } from '../../ui/InfoTable'
import Modal from '../../ui/Modal'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { formatDate } from '../../utils'
import { CampaignForm } from './CampaignForm'
import { CampaignTag, DeliveryRatio } from './Campaigns'
import ChannelTag from './ChannelTag'

export default function CampaignOverview() {
    const [project] = useContext(ProjectContext)
    const [preferences] = useContext(PreferencesContext)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const DelimitedLists = ({ lists }: { lists?: List[] }) => {
        return lists?.map<ReactNode>(
            list => (
                <Link to={`/projects/${campaign.project_id}/lists/${list.id}`} key={list.id}>{list.name}</Link>
            ),
        )?.reduce((prev, curr) => prev ? [prev, ', ', curr] : curr, '') ?? '&#8211;'
    }

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
                launched_at: campaign.send_at ? formatDate(preferences, campaign.send_at, undefined, project.timezone) : undefined,
                in_timezone: campaign.send_in_user_timezone ? 'Yes' : 'No',
                send_lists: DelimitedLists({ lists: campaign.lists }),
                exclusion_lists: DelimitedLists({ lists: campaign.exclusion_lists }),
                delivery: DeliveryRatio({ delivery: campaign.delivery }),
            }} />
            <Modal
                open={isEditOpen}
                onClose={setIsEditOpen}
                title="Edit Campaign"
                size="large"
            >
                <CampaignForm
                    campaign={campaign}
                    type={campaign.type}
                    onSave={campaign => {
                        setCampaign(campaign)
                        setIsEditOpen(false)
                    }}
                />
            </Modal>
        </>
    )
}
