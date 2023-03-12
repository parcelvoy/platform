import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import api from '../../api'
import { CampaignState } from '../../types'
import Button from '../../ui/Button'
import { ArchiveIcon, DuplicateIcon, EditIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import Tag, { TagVariant } from '../../ui/Tag'
import { snakeToTitle } from '../../utils'
import { CampaignForm } from './CampaignForm'
import ChannelTag from './ChannelTag'

export const CampaignTag = ({ state }: { state: CampaignState }) => {
    const variant: Record<CampaignState, TagVariant> = {
        draft: 'plain',
        aborted: 'error',
        scheduled: 'info',
        running: 'info',
        finished: 'success',
    }

    return <Tag variant={variant[state]}>
        {snakeToTitle(state)}
    </Tag>
}

export default function Campaigns() {
    const { projectId = '' } = useParams()
    const navigate = useNavigate()
    const state = useSearchTableQueryState(useCallback(async params => await api.campaigns.search(projectId, params), [projectId]))
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const handleEditCampaign = (id: number) => {
        navigate(id.toString())
    }

    const handleDuplicateCampaign = async (id: number) => {
        const campaign = await api.campaigns.duplicate(projectId, id)
        navigate(campaign.id.toString())
    }

    const handleArchiveCampaign = async (id: number) => {
        await api.campaigns.delete(projectId, id)
        await state.reload()
    }

    return (
        <>
            <PageContent title="Campaigns" actions={
                <Button icon={<PlusIcon />} onClick={() => setIsCreateOpen(true)}>Create Campaign</Button>
            }>
                <SearchTable
                    {...state}
                    columns={[
                        {
                            key: 'name',
                        },
                        {
                            key: 'state',
                            cell: ({ item: { state } }) => CampaignTag({ state }),
                        },
                        {
                            key: 'channel',
                            cell: ({ item: { channel } }) => ChannelTag({ channel }),
                        },
                        {
                            key: 'delivery',
                            cell: ({ item }) => `${item.delivery?.sent ?? 0} / ${item.delivery?.total ?? 0}`,
                        },
                        {
                            key: 'send_at',
                            title: 'Launched At',
                        },
                        { key: 'updated_at' },
                        {
                            key: 'options',
                            cell: ({ item: { id } }) => (
                                <Menu size="small">
                                    <MenuItem onClick={() => handleEditCampaign(id)}>
                                        <EditIcon />Edit
                                    </MenuItem>
                                    <MenuItem onClick={async () => await handleDuplicateCampaign(id)}>
                                        <DuplicateIcon />Duplicate
                                    </MenuItem>
                                    <MenuItem onClick={async () => await handleArchiveCampaign(id)}>
                                        <ArchiveIcon />Archive
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
                title="Create Campaign"
                size="large"
            >
                <CampaignForm
                    onSave={campaign => {
                        setIsCreateOpen(false)
                        navigate(campaign.id.toString())
                    }}
                />
            </Modal>
        </>
    )
}
