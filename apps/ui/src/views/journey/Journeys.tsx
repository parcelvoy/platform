import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import { ArchiveIcon, EditIcon, PlusIcon } from '../../ui/icons'
import { JourneyForm } from './JourneyForm'
import { Menu, MenuItem, Tag } from '../../ui'
import { ProjectContext } from '../../contexts'
import { useTranslation } from 'react-i18next'

export default function Journeys() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [open, setOpen] = useState<null | 'create'>(null)
    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.search(project.id, params), [project.id]))

    const handleEditJourney = (id: number) => {
        navigate(id.toString())
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
                    },
                    {
                        key: 'status',
                        cell: ({ item }) => (
                            <Tag variant={item.published ? 'success' : 'plain'}>
                                {item.published ? 'Published' : 'Draft'}
                            </Tag>
                        ),
                    },
                    {
                        key: 'usage',
                        cell: ({ item }) => item.stats?.entrance.toLocaleString(),
                    },
                    {
                        key: 'created_at',
                    },
                    {
                        key: 'updated_at',
                    },
                    {
                        key: 'options',
                        cell: ({ item: { id } }) => (
                            <Menu size="small">
                                <MenuItem onClick={() => handleEditJourney(id)}>
                                    <EditIcon />Edit
                                </MenuItem>
                                <MenuItem onClick={async () => await handleArchiveJourney(id)}>
                                    <ArchiveIcon />Archive
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
