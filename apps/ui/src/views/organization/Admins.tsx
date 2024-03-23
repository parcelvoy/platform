import { useCallback, useContext, useState } from 'react'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import api from '../../api'
import { Button, Modal } from '../../ui'
import { AdminContext } from '../../contexts'
import { useTranslation } from 'react-i18next'
import FormWrapper from '../../ui/form/FormWrapper'
import { Admin, organizationRoles } from '../../types'
import TextInput from '../../ui/form/TextInput'
import { checkOrganizationRole, snakeToTitle } from '../../utils'
import { SingleSelect } from '../../ui/form/SingleSelect'

export default function Admins() {
    const { t } = useTranslation()
    const state = useSearchTableQueryState(useCallback(async params => await api.admins.search(params), []))
    const admin = useContext(AdminContext)
    const [editing, setEditing] = useState<Partial<Admin>>()

    return (
        <>
            <PageContent title={t('admins')} actions={
                <Button onClick={() => setEditing({})}>{t('add_admin')}</Button>
            }>
                <SearchTable
                    {...state}
                    columns={[
                        { key: 'first_name', title: t('first_name') },
                        { key: 'last_name', title: t('last_name') },
                        { key: 'email', title: t('email') },
                        {
                            key: 'role',
                            title: t('role'),
                            cell: ({ item }) => snakeToTitle(item.role),
                        },
                    ]}
                    onSelectRow={setEditing} />
            </PageContent>

            <Modal
                open={Boolean(editing)}
                onClose={() => setEditing(undefined)}
                title={editing?.id ? t('edit_admin') : t('add_admin')}
                size="small"
                description={editing?.id ? t('edit_admin_description') : t('add_admin_description')}
            >
                {editing && <FormWrapper<Admin>
                    onSubmit={async (member) => {
                        member.id != null
                            ? await api.admins.update(member.id, member)
                            : await api.admins.create(member)
                        setEditing(undefined)
                        await state.reload()
                    }}
                    defaultValues={editing}
                >
                    {form => (
                        <>
                            <TextInput.Field
                                form={form}
                                name="email"
                                label={t('email')}
                                required
                            />
                            <TextInput.Field
                                form={form}
                                name="first_name"
                                label={t('first_name')}
                            />
                            <TextInput.Field
                                form={form}
                                name="last_name"
                                label={t('last_name')}
                            />
                            <SingleSelect.Field
                                form={form}
                                name="role"
                                label={t('role')}
                                disabled={checkOrganizationRole(admin!.role, editing.role)}
                                options={organizationRoles}
                                getOptionDisplay={snakeToTitle}
                                required
                            />
                        </>
                    )}
                </FormWrapper>}
            </Modal>
        </>
    )
}
