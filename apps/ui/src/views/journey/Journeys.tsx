import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router'
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
import { Journey } from '../../types'

export const JourneyTag = ({ status }: Pick<Journey, 'status'>) => {
    const { t } = useTranslation()
    const variant = status === 'live' ? 'success' : 'plain'
    const title = t(status)
    return <Tag variant={variant}>{title}</Tag>
}

export default function Journeys() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [open, setOpen] = useState<null | 'create'>(null)
    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.search(project.id, params), [project.id]))

    const handleEditJourney = async (id: number) => {
        await navigate(id.toString())
    }

    const handleDuplicateJourney = async (id: number) => {
        const journey = await api.journeys.duplicate(project.id, id)
        await navigate(journey.id.toString())
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
                        cell: ({ item }) => <JourneyTag status={item.status} />,
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
                                <MenuItem onClick={async () => await handleEditJourney(id)}>
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
                onSelectRow={async r => { await navigate(r.id.toString()) }}
                enableSearch
                tagEntity="journeys"
            />
            <Modal
                onClose={() => setOpen(null)}
                open={!!open}
                title={t('create_journey')}
            >
                <JourneyForm
                    onSaved={async journey => {
                        setOpen(null)
                        await navigate(journey.id.toString())
                    }}
                />
            </Modal>
        </PageContent>
    )
}
