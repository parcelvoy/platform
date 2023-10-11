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
import OptionField from '../../ui/form/OptionField'
import TextInput from '../../ui/form/TextInput'

type EditMemberData = Pick<ProjectAdmin, 'admin_id' | 'role'> & { id?: number }
type InviteMemberData = ProjectAdminInviteParams

interface TeamInviteProps extends ModalStateProps {
    member?: Partial<EditMemberData>
    onMember: (member: ProjectAdmin) => void
}

export default function TeamInvite({ member, onMember, ...props }: TeamInviteProps) {

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
            title={member.id ? 'Update Permissions' : 'Add Team Member'}
            size="small"
            description={member.id ? 'Update the permissions for this team member.' : 'Add an existing team member to this project or invite someone new.'}
        >
            <OptionField
                value={newOrExisting}
                onChange={setNewOrExisting}
                name="invite_type"
                options={[
                    { key: 'existing', label: 'Existing Team Member' },
                    { key: 'new', label: 'New Team Member' },
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
                        submitLabel="Invite to Project"
                    >
                        {form => (
                            <>
                                <TextInput.Field
                                    form={form}
                                    name="email"
                                    label="Email"
                                    required
                                />
                                <SingleSelect.Field
                                    form={form}
                                    name="role"
                                    label="Role"
                                    subtitle={admin?.id === member.admin_id && (
                                        <span style={{ color: 'red' }}>
                                            {'You cannot change your own roles.'}
                                        </span>
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
                        submitLabel={member.id ? 'Update Permissions' : 'Add to Project'}
                    >
                        {form => (
                            <>
                                <EntityIdPicker.Field
                                    form={form}
                                    name="admin_id"
                                    label="Admin"
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
                                    label="Role"
                                    subtitle={admin?.id === member.admin_id && (
                                        <span style={{ color: 'red' }}>
                                            {'You cannot change your own roles.'}
                                        </span>
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
            onClose={() => {
                setInvitedMember(undefined)
            }}
            title="Member Added"
            size="small">
            <p>You have successfully added a member to this project. They will have access to this project as soon as they log in for the first time. Would you like to send them an email about their new access?</p>
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
