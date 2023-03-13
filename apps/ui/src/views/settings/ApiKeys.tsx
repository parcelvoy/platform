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
import { PlusIcon } from '../../ui/icons'

export default function ProjectApiKeys() {

    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.apiKeys.search(project.id, params), [project]))

    const [editing, setEditing] = useState<null | Partial<ProjectApiKey>>(null)

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'name' },
                    { key: 'scope' },
                    { key: 'value' },
                    { key: 'description' },
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
                title="Create API Key"
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
                    defaultValues={{ scope: 'public' }}
                    submitLabel="Create"
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
