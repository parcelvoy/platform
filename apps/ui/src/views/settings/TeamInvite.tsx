import { useCallback, useContext, useState } from 'react'
import { ProjectAdmin, ProjectAdminInviteParams, projectRoles } from '../../types'
import { Button, LinkButton, Modal } from '../../ui'
import { ModalStateProps } from '../../ui/Modal'
import { EntityIdPicker } from '../../ui/form/EntityIdPicker'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'
import api from '../../api'
import { AdminContext, ProjectContext } from '../../contexts'
import { combine, snakeToTitle } from '../../utils'
import RadioInput from '../../ui/form/RadioInput'
import TextInput from '../../ui/form/TextInput'
import { useTranslation } from 'react-i18next'

type EditMemberData = Pick<ProjectAdmin, 'admin_id' | 'role'> & { id?: number }
type InviteMemberData = ProjectAdminInviteParams

interface TeamInviteProps extends ModalStateProps {
    member?: Partial<EditMemberData>
    onMember: (member: ProjectAdmin) => void
}

export default function TeamInvite({ member, onMember, ...props }: TeamInviteProps) {

    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const admin = useContext(AdminContext)
    const searchAdmins = useCallback(async (q: string) => await api.admins.search({ q, limit: 100 }), [])
    const [newOrExisting, setNewOrExisting] = useState<'new' | 'existing'>('existing')
    const [invitedMember, setInvitedMember] = useState<ProjectAdmin>()

    const mailto = (email: string) => {
        const text = `Hello!\n\nI have just added you to the project ${project.name} on Parcelvoy. To get started and setup your account, please click the link below:\n\n${window.location.origin}`
        return `mailto:${email}?subject=Parcelvoy%20Project&body=${encodeURI(text)}`
    }

    return <>
        {member && <Modal
            {...props}
            title={member.id ? t('update_permissions') : t('add_team_member')}
            size="small"
            description={member.id ? t('team_edit_description_update') : t('team_edit_description_add')}
        >
            <RadioInput
                value={newOrExisting}
                onChange={setNewOrExisting}
                options={[
                    { key: 'existing', label: t('existing_team_member') },
                    { key: 'new', label: t('new_team_member') },
                ]}
            />
            { newOrExisting === 'new'
                ? (
                    <FormWrapper<InviteMemberData>
                        onSubmit={async (member) => {
                            const newMember = await api.projectAdmins.invite(project.id, member)
                            setInvitedMember(newMember)
                        }}
                        defaultValues={member}
                        submitLabel={t('invite_to_project')}
                    >
                        {form => (
                            <>
                                <TextInput.Field
                                    form={form}
                                    name="email"
                                    label={t('email')}
                                    required
                                />
                                <SingleSelect.Field
                                    form={form}
                                    name="role"
                                    label={t('role')}
                                    subtitle={admin?.id === member.admin_id && (
                                        <span style={{ color: 'red' }}>{t('role_cant_change')}</span>
                                    )}
                                    options={projectRoles}
                                    getOptionDisplay={snakeToTitle}
                                    required
                                    disabled={!admin || admin.id === member.admin_id}
                                />
                            </>
                        )}
                    </FormWrapper>
                )
                : (
                    <FormWrapper<EditMemberData>
                        onSubmit={async ({ role, admin_id }) => {
                            const member = await api.projectAdmins.add(project.id, admin_id, { role })
                            onMember(member)
                        }}
                        defaultValues={member}
                        submitLabel={member.id ? t('update_permissions') : t('invite_to_project')}
                    >
                        {form => (
                            <>
                                <EntityIdPicker.Field
                                    form={form}
                                    name="admin_id"
                                    label={t('admin')}
                                    search={searchAdmins}
                                    get={api.admins.get}
                                    displayValue={({ first_name, last_name, email }) => first_name
                                        ? combine(first_name, last_name, `(${email})`)
                                        : email
                                    }
                                    required
                                    disabled={!!member.admin_id}
                                />
                                <SingleSelect.Field
                                    form={form}
                                    name="role"
                                    label={t('role')}
                                    subtitle={admin?.id === member.admin_id && (
                                        <span style={{ color: 'red' }}>{t('role_cant_change')}</span>
                                    )}
                                    options={projectRoles}
                                    getOptionDisplay={snakeToTitle}
                                    required
                                    disabled={!admin || admin.id === member.admin_id}
                                />
                            </>
                        )}
                    </FormWrapper>
                )
            }
        </Modal>}
        {invitedMember && <Modal
            open={invitedMember !== undefined}
            onClose={() => setInvitedMember(undefined)}
            title={t('member_added')}
            size="small">
            <p>{t('member_added_description')}</p>
            <LinkButton to={mailto(invitedMember.email)} onClick={() => {
                onMember(invitedMember)
                setInvitedMember(undefined)
            }}>Email</LinkButton>&nbsp;
            <Button variant="secondary" onClick={() => {
                onMember(invitedMember)
                setInvitedMember(undefined)
            }}>Done</Button>
        </Modal>}
    </>
}
