import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { AdminContext, ProjectContext } from '../../contexts'
import { ProjectAdmin, projectRoles } from '../../types'
import Button from '../../ui/Button'
import { EntityIdPicker } from '../../ui/form/EntityIdPicker'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { ArchiveIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { snakeToTitle } from '../../utils'

type EditFormData = Pick<ProjectAdmin, 'admin_id' | 'role'> & { id?: number }

export default function Teams() {
    const admin = useContext(AdminContext)
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.projectAdmins.search(project.id, params), [project]))
    const [editing, setEditing] = useState<null | Partial<EditFormData>>(null)
    const searchAdmins = useCallback(async (q: string) => await api.admins.search({ q, limit: 100 }), [])

    return (
        <>
            <SearchTable
                {...state}
                title="Team"
                actions={
                    <Button
                        icon={<PlusIcon />}
                        size="small"
                        onClick={() => setEditing({
                            admin_id: undefined,
                            role: 'support',
                        })}
                    >
                        Add Team Member
                    </Button>
                }
                columns={[
                    { key: 'first_name' },
                    { key: 'last_name' },
                    { key: 'email' },
                    {
                        key: 'role',
                        cell: ({ item }) => snakeToTitle(item.role),
                    },
                    {
                        key: 'options',
                        cell: ({ item }) => (
                            <Menu size="small">
                                <MenuItem
                                    onClick={async () => {
                                        await api.projectAdmins.remove(item.project_id, item.admin_id)
                                        await state.reload()
                                    }}
                                >
                                    <ArchiveIcon /> Remove
                                </MenuItem>
                            </Menu>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={setEditing}
                enableSearch
            />
            <Modal
                title={editing?.id ? 'Update Permissions' : 'Add Team Member'}
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
                size="small"
            >
                {
                    editing && (
                        <FormWrapper<EditFormData>
                            onSubmit={async ({ admin_id, role }) => {
                                await api.projectAdmins.add(project.id, admin_id, { role })
                                await state.reload()
                                setEditing(null)
                            }}
                            defaultValues={editing}
                            submitLabel={editing.id ? 'Update Permissions' : 'Add to Project'}
                        >
                            {
                                form => (
                                    <>
                                        <EntityIdPicker.Field
                                            form={form}
                                            name="admin_id"
                                            label="Admin"
                                            search={searchAdmins}
                                            get={api.admins.get}
                                            displayValue={({ first_name, last_name, email }) => `${first_name} ${last_name} (${email})`}
                                            required
                                            disabled={!!editing.admin_id}
                                        />
                                        <SingleSelect.Field
                                            form={form}
                                            name="role"
                                            label="Role"
                                            subtitle={admin?.id === editing.admin_id && (
                                                <span style={{ color: 'red' }}>
                                                    {'You cannot change your own roles.'}
                                                </span>
                                            )}
                                            options={projectRoles}
                                            getOptionDisplay={snakeToTitle}
                                            required
                                            disabled={!admin || admin.id === editing.admin_id}
                                        />
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
