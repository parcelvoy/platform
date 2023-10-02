import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import { PlusIcon } from '../../ui/icons'
import { JourneyForm } from './JourneyForm'
import { Tag } from '../../ui'

export default function Journeys() {
    const { projectId = '' } = useParams()
    const navigate = useNavigate()
    const [open, setOpen] = useState<null | 'create'>(null)
    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.search(projectId, params), [projectId]))

    return (
        <PageContent
            title="Journeys"
            actions={
                <Button icon={<PlusIcon />} onClick={() => setOpen('create')}>
                    Create Journey
                </Button>
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
                        cell: ({ item }) => item.stats?.entrance,
                    },
                    {
                        key: 'created_at',
                    },
                    {
                        key: 'updated_at',
                    },
                ]}
                onSelectRow={r => navigate(r.id.toString())}
                enableSearch
                tagEntity="journeys"
            />
            <Modal
                onClose={() => setOpen(null)}
                open={!!open}
                title="Create Journey"
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
