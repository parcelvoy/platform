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
import CodeExample from '../../ui/CodeExample'
import { env } from '../../config/env'
import { useTranslation } from 'react-i18next'

export default function CampaignOverview() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
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

    const canEdit = campaign.type === 'trigger' || campaign.state === 'draft' || campaign.state === 'aborted'

    const extra = campaign.channel === 'text'
        ? '"phone": "+12345678900",'
        : campaign.channel === 'push'
            ? '"device_token": "DEVICE_TOKEN",'
            : '"email": "email@testing.com",'

    const code = `curl --request POST \\
    --url '${env.api.baseURL}/client/campaigns/${campaign.id}/trigger' \\
    --header 'Authorization: Bearer API_KEY' \\
    --header 'Content-Type: application/json' \\
    --data '{
    "user": {
        "external_id": "2391992",
        ${extra}
        "extra_user_property": true
    },
    "event": {
        "purchase_amount": 29.99
    }
}'`

    return (
        <>
            <Heading
                title={t('details')}
                size="h3"
                actions={
                    canEdit && <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setIsEditOpen(true)}
                    >{t('edit_details')}</Button>
                }
            />

            <Heading title={t('channel')} size="h4" />
            <InfoTable rows={{
                [t('id')]: campaign.id,
                [t('channel')]: ChannelTag({ channel: campaign.channel }),
                [t('provider')]: campaign.provider.name,
                [t('subscription_group')]: campaign.subscription.name,
            }} />

            {campaign.type === 'blast' && <>
                <Heading title={t('delivery')} size="h4" />
                <InfoTable rows={{
                    [t('state')]: CampaignTag({ state: campaign.state, send_at: campaign.send_at }),
                    [t('launched_at')]: campaign.send_at ? formatDate(preferences, campaign.send_at, undefined, project.timezone) : undefined,
                    [t('in_timezone')]: campaign.send_in_user_timezone ? 'Yes' : 'No',
                    [t('send_lists')]: DelimitedLists({ lists: campaign.lists }),
                    [t('exclusion_lists')]: DelimitedLists({ lists: campaign.exclusion_lists }),
                    [t('delivery')]: DeliveryRatio({ delivery: campaign.delivery }),
                }} />
            </>}
            {
                campaign.type === 'trigger' && (
                    <CodeExample
                        code={code}
                        title={t('delivery')}
                        description={t('campaign_delivery_trigger_description')}
                    />
                )
            }
            <Modal
                open={isEditOpen}
                onClose={setIsEditOpen}
                title={t('edit_campaign')}
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
