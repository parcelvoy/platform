import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { ProjectApiKey } from '../../types'
import Button from '../../ui/Button'
import OptionField from '../../ui/form/OptionField'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { ArchiveIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'

export default function ProjectApiKeys() {

    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.apiKeys.search(project.id, params), [project]))

    const [editing, setEditing] = useState<null | Partial<ProjectApiKey>>(null)

    const handleArchive = async (id: number) => {
        if (confirm('Are you sure you want to archive this key? All clients using the key will immediately be unable to access the API.')) {
            await api.apiKeys.delete(project.id, id)
            await state.reload()
        }
    }

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'name' },
                    { key: 'scope' },
                    { key: 'value' },
                    { key: 'description' },
                    {
                        key: 'options',
                        cell: ({ item: { id } }) => (
                            <Menu size="small">
                                <MenuItem onClick={async () => await handleArchive(id)}>
                                    <ArchiveIcon />Archive
                                </MenuItem>
                            </Menu>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={setEditing}
                title="API Keys"
                actions={
                    <Button
                        icon={<PlusIcon />}
                        size="small"
                        onClick={() => setEditing({ scope: 'public' })}
                    >
                        Create Key
                    </Button>
                }
            />
            <Modal
                title={editing ? 'Update API Key' : 'Create API Key'}
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
            >
                <FormWrapper<ProjectApiKey>
                    onSubmit={
                        async ({ id, name, description, scope }) => {
                            if (id) {
                                await api.apiKeys.update(project.id, id, { name, description })
                            } else {
                                await api.apiKeys.create(project.id, { name, description, scope })
                            }
                            await state.reload()
                            setEditing(null)
                        }
                    }
                    defaultValues={editing ?? { scope: 'public' }}
                    submitLabel={editing ? 'Save' : 'Create'}
                >
                    {
                        form => (
                            <>
                                <TextField
                                    form={form}
                                    name="name"
                                    label="Name"
                                    required
                                />
                                <TextField
                                    form={form}
                                    name="description"
                                    label="Description"
                                    textarea
                                />
                                {
                                    !!(editing && !editing.id) && (
                                        <OptionField
                                            form={form}
                                            name="scope"
                                            label="Scope"
                                            options={[
                                                { key: 'public', label: 'Public' },
                                                { key: 'secret', label: 'Secret' },
                                            ]}
                                        />
                                    )
                                }
                            </>
                        )
                    }
                </FormWrapper>
            </Modal>
        </>
    )
}
