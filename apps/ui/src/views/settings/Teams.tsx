import { Key, ReactNode, useCallback, useContext, useState } from 'react'
import { useController } from 'react-hook-form'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Admin, ProjectAdminCreateParams } from '../../types'
import Button from '../../ui/Button'
import { DataTableCol } from '../../ui/DataTable'
import { SelectionProps } from '../../ui/form/Field'
import FormWrapper from '../../ui/form/FormWrapper'
import { ArchiveIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import Modal from '../../ui/Modal'
import { SearchTable, SearchTableQueryState, useSearchTableState } from '../../ui/SearchTable'
import { useRoute } from '../router'

interface AdminTableParams {
    state: SearchTableQueryState<Admin>
    title?: ReactNode
    actions?: ReactNode
    selectedRow?: Key
    onSelectRow?: (id: number) => void
    onDeleteRow?: (id: number) => void
    showOptions?: boolean
}

const AdminTable = ({
    state,
    selectedRow,
    onSelectRow,
    onDeleteRow,
    title,
    actions,
}: AdminTableParams) => {
    const route = useRoute()
    function handleOnSelectRow(id: number) {
        onSelectRow ? onSelectRow(id) : route(`lists/${id}`)
    }

    const columns: Array<DataTableCol<Admin>> = [
        { key: 'first_name' },
        { key: 'last_name' },
        { key: 'email' },
    ]
    if (onDeleteRow) {
        columns.push({
            key: 'options',
            cell: ({ item: { id } }) => (
                <Menu size="small">
                    <MenuItem onClick={() => onDeleteRow?.(id)}>
                        <ArchiveIcon /> Remove
                    </MenuItem>
                </Menu>
            ),
        })
    }

    return <SearchTable
        {...state}
        title={title}
        actions={actions}
        columns={columns}
        itemKey={({ item }) => item.id}
        selectedRow={selectedRow}
        onSelectRow={({ id }) => handleOnSelectRow(id)}
    />
}

const AdminSelection = ({ name, control }: SelectionProps<ProjectAdminCreateParams>) => {
    const state = useSearchTableState(useCallback(async params => await api.admins.search(params), []))

    const { field: { value, onChange } } = useController({ name, control, rules: { required: true } })

    return <AdminTable
        state={state}
        selectedRow={value}
        onSelectRow={(id) => onChange(id)} />
}

export default function Teams() {
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.projectAdmins.search(project.id, params), [project]))
    const [isModalOpen, setIsModalOpen] = useState(false)
    const handleDeleteProjectAdmin = async (id: number) => {
        await api.projectAdmins.delete(project.id, id)
        await state.reload()
    }

    return (
        <>
            <AdminTable
                state={state}
                title="Team"
                onDeleteRow={handleDeleteProjectAdmin}
                actions={
                    <Button icon={<PlusIcon />} size="small" onClick={() => setIsModalOpen(true)}>
                        Add Team Member
                    </Button>
                }
            />
            <Modal
                title="Add Team Member"
                open={isModalOpen}
                onClose={setIsModalOpen}
                size="regular"
            >
                <FormWrapper<ProjectAdminCreateParams>
                    onSubmit={
                        async admin => {
                            await api.projectAdmins.create(project.id, admin)
                            await state.reload()
                            setIsModalOpen(false)
                        }
                    }
                    submitLabel="Add To Project"
                >
                    {form => <>
                        <AdminSelection
                            name="admin_id"
                            control={form.control} />
                    </>}
                </FormWrapper>
            </Modal>
        </>
    )
}
