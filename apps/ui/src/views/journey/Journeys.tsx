import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import { Journey } from '../../types'
import Button from '../../ui/Button'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import { TagPicker } from '../settings/TagPicker'

export default function Journeys() {
    const { projectId = '' } = useParams()
    const navigate = useNavigate()
    const [open, setOpen] = useState<null | 'create'>(null)
    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.search(projectId, params), [projectId]))

    return (
        <PageContent
            title="Journeys"
            actions={
                <Button icon="plus-lg" onClick={() => setOpen('create')}>
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
                tagEntity="journeys"
            />
            <Modal
                onClose={() => setOpen(null)}
                open={!!open}
                title="Create Journey"
            >
                <FormWrapper<Journey>
                    onSubmit={async journey => {
                        journey = await api.journeys.create(projectId, journey)
                        setOpen(null)
                        navigate(journey.id.toString())
                    }}
                >
                    {
                        form => (
                            <>
                                <TextField
                                    form={form}
                                    name="name"
                                    required
                                />
                                <TextField
                                    form={form}
                                    name="description"
                                    textarea
                                />
                                <TagPicker.Field
                                    form={form}
                                    name="tags"
                                />
                            </>
                        )
                    }
                </FormWrapper>
            </Modal>
        </PageContent>
    )
}
