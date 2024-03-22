import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { ProjectAdmin } from '../../types'
import Button from '../../ui/Button'
import { ArchiveIcon, EditIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { snakeToTitle } from '../../utils'
import TeamInvite from './TeamInvite'
import { useTranslation } from 'react-i18next'

type EditFormData = Pick<ProjectAdmin, 'admin_id' | 'role'> & { id?: number }

export default function Teams() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.projectAdmins.search(project.id, params), [project]))
    const [editing, setEditing] = useState<Partial<EditFormData>>()

    return (
        <>
            <SearchTable
                {...state}
                title={t('team')}
                actions={
                    <Button
                        icon={<PlusIcon />}
                        size="small"
                        onClick={() => setEditing({
                            admin_id: undefined,
                            role: 'support',
                        })}
                    >{t('add_team_member')}</Button>
                }
                columns={[
                    { key: 'first_name', title: t('first_name') },
                    { key: 'last_name', title: t('last_name') },
                    { key: 'email', title: t('email') },
                    {
                        key: 'role',
                        title: t('role'),
                        cell: ({ item }) => snakeToTitle(item.role),
                    },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item }) => (
                            <Menu size="small">
                                <MenuItem
                                    onClick={async () => {
                                        await api.projectAdmins.remove(item.project_id, item.admin_id)
                                        await state.reload()
                                    }}
                                >
                                    <ArchiveIcon /> {t('remove')}
                                </MenuItem>
                                <MenuItem onClick={() => setEditing(item)}>
                                    <EditIcon /> {t('edit')}
                                </MenuItem>
                            </Menu>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={setEditing}
                enableSearch
            />

            <TeamInvite
                member={editing}
                onMember={async () => {
                    await state.reload()
                    setEditing(undefined)
                }}
                open={Boolean(editing)}
                onClose={() => setEditing(undefined)}
            />
        </>
    )
}
