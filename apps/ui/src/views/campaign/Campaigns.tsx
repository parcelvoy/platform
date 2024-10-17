import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router'
import api, { apiUrl } from '../../api'
import { Campaign, CampaignDelivery, CampaignState } from '../../types'
import Button, { LinkButton } from '../../ui/Button'
import { ArchiveIcon, DuplicateIcon, EditIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import Tag, { TagVariant } from '../../ui/Tag'
import { formatDate, snakeToTitle } from '../../utils'
import { CampaignForm } from './CampaignForm'
import { ChannelIcon } from './ChannelTag'
import PreviewImage from '../../ui/PreviewImage'
import { Alert } from '../../ui'
import { ProjectContext } from '../../contexts'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { Translation, useTranslation } from 'react-i18next'

export const CampaignTag = ({ state }: { state: CampaignState }) => {
    const variant: Record<CampaignState, TagVariant> = {
        draft: 'plain',
        aborted: 'error',
        pending: 'info',
        scheduled: 'info',
        running: 'info',
        finished: 'success',
    }
    return <Tag variant={variant[state]}>
        <Translation>{ (t) => t(state) }</Translation>
    </Tag>
}

export const DeliveryRatio = ({ delivery }: { delivery: CampaignDelivery }) => {
    const sent = (delivery?.sent ?? 0).toLocaleString()
    const total = (delivery?.total ?? 0).toLocaleString()
    return `${sent} / ${total}`
}

export const OpenRatio = ({ delivery }: { delivery: CampaignDelivery }) => {
    const opens = (delivery?.opens ?? 0)
    const sent = (delivery?.sent ?? 0)
    const ratio = sent > 0 ? opens / sent : 0
    const opensStr = opens.toLocaleString()
    const ratioStr = ratio.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 0 })
    return `${opensStr} (${ratioStr})`
}

export const ClickRatio = ({ delivery }: { delivery: CampaignDelivery }) => {
    const clicks = (delivery?.clicks ?? 0)
    const sent = (delivery?.sent ?? 0)
    const ratio = sent > 0 ? clicks / sent : 0
    const clicksStr = clicks.toLocaleString()
    const ratioStr = ratio.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 0 })
    return `${clicksStr} (${ratioStr})`
}

export default function Campaigns() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [preferences] = useContext(PreferencesContext)
    const state = useSearchTableQueryState(useCallback(async params => await api.campaigns.search(project.id, params), [project.id]))
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const handleCreateCampaign = (campaign: Campaign) => {
        setIsCreateOpen(false)
        navigate(`${campaign.id}/design`)
    }

    const handleEditCampaign = (id: number) => {
        navigate(id.toString())
    }

    const handleDuplicateCampaign = async (id: number) => {
        const campaign = await api.campaigns.duplicate(project.id, id)
        navigate(campaign.id.toString())
    }

    const handleArchiveCampaign = async (id: number) => {
        await api.campaigns.delete(project.id, id)
        await state.reload()
    }

    return (
        <>
            <PageContent title={t('campaigns')} actions={
                <Button icon={<PlusIcon />} onClick={() => setIsCreateOpen(true)}>{t('create_campaign')}</Button>
            } banner={project.has_provider === false && (
                <Alert
                    variant="plain"
                    title={t('setup')}
                    actions={
                        <LinkButton to={`/projects/${project.id}/settings/integrations`}>{t('setup_integration')}</LinkButton>
                    }
                >{t('setup_integration_description')}</Alert>
            )}>
                <SearchTable
                    {...state}
                    columns={[
                        {
                            key: 'name',
                            title: t('name'),
                            sortable: true,
                            cell: ({ item: { id, name, channel } }) => (
                                <div className="multi-cell">
                                    { channel === 'email'
                                        ? <PreviewImage url={apiUrl(project.id, `campaigns/${id}/preview`)} width={50} height={40}>
                                            <div className="placeholder">
                                                <ChannelIcon channel={channel} />
                                            </div>
                                        </PreviewImage>
                                        : <div className="placeholder">
                                            <ChannelIcon channel={channel} />
                                        </div>
                                    }
                                    <div className="text">
                                        <div className="title">{name}</div>
                                        <div className="subtitle">
                                            {snakeToTitle(channel)}</div>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            key: 'state',
                            title: t('state'),
                            sortable: true,
                            cell: ({ item: { state } }) => CampaignTag({ state }),
                        },
                        {
                            key: 'delivery',
                            title: t('delivery'),
                            cell: ({ item: { delivery } }) => DeliveryRatio({ delivery }),
                        },
                        {
                            key: 'open_rate',
                            title: t('open_rate'),
                            cell: ({ item: { delivery } }) => OpenRatio({ delivery }),
                        },
                        {
                            key: 'click_rate',
                            title: t('click_rate'),
                            cell: ({ item: { delivery } }) => ClickRatio({ delivery }),
                        },
                        {
                            key: 'send_at',
                            sortable: true,
                            title: t('launched_at'),
                            cell: ({ item: { send_at, type } }) => {
                                return send_at != null
                                    ? formatDate(preferences, send_at, 'Ppp')
                                    : type === 'trigger'
                                        ? t('api_triggered')
                                        : <>&#8211;</>
                            },
                        },
                        {
                            key: 'updated_at',
                            title: t('updated_at'),
                            sortable: true,
                        },
                        {
                            key: 'options',
                            title: t('options'),
                            cell: ({ item: { id } }) => (
                                <Menu size="small">
                                    <MenuItem onClick={() => handleEditCampaign(id)}>
                                        <EditIcon />{t('edit')}
                                    </MenuItem>
                                    <MenuItem onClick={async () => await handleDuplicateCampaign(id)}>
                                        <DuplicateIcon />{t('duplicate')}
                                    </MenuItem>
                                    <MenuItem onClick={async () => await handleArchiveCampaign(id)}>
                                        <ArchiveIcon />{t('archive')}
                                    </MenuItem>
                                </Menu>
                            ),
                        },
                    ]}
                    onSelectRow={({ id }) => navigate(id.toString())}
                    enableSearch
                    tagEntity="campaigns"
                />
            </PageContent>
            <Modal
                open={isCreateOpen}
                onClose={setIsCreateOpen}
                title={t('create_campaign')}
                size="large"
            >
                <CampaignForm onSave={handleCreateCampaign} />
            </Modal>
        </>
    )
}
