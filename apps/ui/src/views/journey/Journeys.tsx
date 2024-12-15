import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import { ArchiveIcon, DuplicateIcon, EditIcon, PlusIcon } from '../../ui/icons'
import { JourneyForm } from './JourneyForm'
import { Menu, MenuItem, Tag } from '../../ui'
import { ProjectContext } from '../../contexts'
import { useTranslation } from 'react-i18next'

export const JourneyTag = ({ published }: { published: boolean }) => {
    const { t } = useTranslation()
    const variant = published ? 'success' : 'plain'
    const title = published ? t('published') : t('draft')
    return <Tag variant={variant}>{title}</Tag>
}

export default function Journeys() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [open, setOpen] = useState<null | 'create'>(null)
    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.search(project.id, params), [project.id]))

    const handleEditJourney = (id: number) => {
        navigate(id.toString())
    }

    const handleDuplicateJourney = async (id: number) => {
        const journey = await api.journeys.duplicate(project.id, id)
        navigate(journey.id.toString())
    }

    const handleArchiveJourney = async (id: number) => {
        await api.journeys.delete(project.id, id)
        await state.reload()
    }

    return (
        <PageContent
            title={t('journeys')}
            actions={
                <Button icon={<PlusIcon />} onClick={() => setOpen('create')}>{t('create_journey')}</Button>
            }
        >
            <SearchTable
                {...state}
                columns={[
                    {
                        key: 'name',
                        title: t('name'),
                    },
                    {
                        key: 'status',
                        title: t('status'),
                        cell: ({ item }) => <JourneyTag published={item.published} />,
                    },
                    {
                        key: 'usage',
                        title: t('usage'),
                        cell: ({ item }) => item.stats?.entrance.toLocaleString(),
                    },
                    {
                        key: 'created_at',
                        title: t('created_at'),
                    },
                    {
                        key: 'updated_at',
                        title: t('updated_at'),
                    },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item: { id } }) => (
                            <Menu size="small">
                                <MenuItem onClick={() => handleEditJourney(id)}>
                                    <EditIcon />{t('edit')}
                                </MenuItem>
                                <MenuItem onClick={async () => await handleDuplicateJourney(id)}>
                                    <DuplicateIcon />{t('duplicate')}
                                </MenuItem>
                                <MenuItem onClick={async () => await handleArchiveJourney(id)}>
                                    <ArchiveIcon />{t('archive')}
                                </MenuItem>
                            </Menu>
                        ),
                    },
                ]}
                onSelectRow={r => navigate(r.id.toString())}
                enableSearch
                tagEntity="journeys"
            />
            <Modal
                onClose={() => setOpen(null)}
                open={!!open}
                title={t('create_journey')}
            >
                <JourneyForm
                    onSaved={journey => {
                        setOpen(null)
                        navigate(journey.id.toString())
                    }}
                />
            </Modal>
        </PageContent>
    )
}
