import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Tag } from '../../types'
import Button from '../../ui/Button'
import FormWrapper from '../../ui/form/FormWrapper'
import TextField from '../../ui/form/TextField'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'

export default function Tags() {

    const [project] = useContext(ProjectContext)
    const search = useSearchTableState(useCallback(async params => await api.tags.search(project.id, params), [project]))
    const [editing, setEditing] = useState<null | Tag>(null)

    return (
        <>
            <SearchTable
                {...search}
                columns={[
                    {
                        key: 'name',
                    },
                    {
                        key: 'usage',
                        title: 'Usage',
                        cell: () => 'TODO',
                    },
                ]}
                title='Tags'
                description='Use tags to organize and report on your campaigns, journeys, lists, and users.'
                actions={
                    <>
                        <Button
                            size='small'
                            variant='primary'
                            onClick={() => setEditing({ id: 0, name: 'New Tag' })}
                            icon='plus'
                        >
                            {'Create Tag'}
                        </Button>
                    </>
                }
                onSelectRow={setEditing}
            />
            <Modal
                open={!!editing}
                onClose={() => setEditing(null)}
                title={editing?.id ? 'Update Tag' : 'Create Tag'}
            >
                {
                    editing && (
                        <FormWrapper<Tag>
                            onSubmit={async ({ id, name }) => {
                                if (id) {
                                    await api.tags.update(project.id, id, { name })
                                } else {
                                    await api.tags.create(project.id, { name })
                                }
                                await search.reload()
                                setEditing(null)
                            }}
                            defaultValues={editing}
                        >
                            {
                                form => (
                                    <>
                                        <TextField form={form} name='name' required />
                                    </>
                                )
                            }
                        </FormWrapper>
                    )
                }
            </Modal>
        </>
    )
}
