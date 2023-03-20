import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { ProjectApiKey, projectRoles } from '../../types'
import Button from '../../ui/Button'
import OptionField from '../../ui/form/OptionField'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { ArchiveIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { snakeToTitle } from '../../utils'

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
                    {
                        key: 'role',
                        cell: ({ item }) => item.scope === 'public' ? '--' : item.role,
                    },
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
                        onClick={() => setEditing({ scope: 'public', role: 'support' })}
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
                {
                    editing && (
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
                            defaultValues={editing}
                            submitLabel={editing?.id ? 'Update Key' : 'Create Key'}
                        >
                            {
                                form => {
                                    const scope = form.watch('scope')
                                    return (
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
                                            />
                                            <OptionField
                                                form={form}
                                                name="scope"
                                                label="Scope"
                                                options={[
                                                    { key: 'public', label: 'Public' },
                                                    { key: 'secret', label: 'Secret' },
                                                ]}
                                                disabled={!!editing?.id}
                                            />
                                            {
                                                scope === 'secret' && (
                                                    <SingleSelect.Field
                                                        form={form}
                                                        name="role"
                                                        label="Role"
                                                        options={projectRoles}
                                                        getOptionDisplay={snakeToTitle}
                                                        required
                                                    />
                                                )
                                            }
                                        </>
                                    )
                                }
                            }
                        </FormWrapper>
                    )
                }
            </Modal>
        </>
    )
}
