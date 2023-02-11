import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import Button from '../../ui/Button'
import Dialog from '../../ui/Dialog'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'

export default function Journeys() {
    const { projectId = '' } = useParams()
    const navigate = useNavigate()
    const [open, setOpen] = useState<null | 'create'>(null)
    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.search(projectId, params), [projectId]))

    return (
        <PageContent
            title="Journeys"
            actions={
                <Button icon='plus-lg' onClick={() => setOpen('create')}>
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
                        key: 'created_at',
                    },
                    {
                        key: 'updated_at',
                    },
                ]}
                onSelectRow={r => navigate(r.id.toString())}
                enableSearch
            />
            <Dialog
                onClose={() => setOpen(null)}
                open={!!open}
                title='Create Journey'
            >
                form here
            </Dialog>
        </PageContent>
    )
}
