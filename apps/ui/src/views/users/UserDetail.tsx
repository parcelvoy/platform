import { useContext } from 'react'
import { ProjectContext, UserContext } from '../../contexts'
import PageContent from '../../ui/PageContent'
import { NavigationTabs } from '../../ui/Tabs'
import { Outlet } from 'react-router'
import { InfoTable } from '../../ui/InfoTable'
import { Button } from '../../ui'
import { TrashIcon } from '../../ui/icons'
import api from '../../api'
import { useNavigate } from 'react-router-dom'

export default function UserDetail() {

    const navigate = useNavigate()
    const [project] = useContext(ProjectContext)
    const [{ id, external_id, email, phone, timezone, full_name }] = useContext(UserContext)

    const deleteUser = async () => {
        if (confirm('Are you sure you want to delete this user? All existing data will be removed.\n\nNote: If new data is sent for this user, they will be re-created with whatever data is sent.')) {
            await api.users.delete(project.id, id)
            navigate(`/projects/${project.id}/users`)
        }
    }

    return (
        <PageContent
            title={full_name ?? (email ?? 'No email')}
            desc={
                <InfoTable rows={{ ID: external_id, email, phone, timezone }} direction="horizontal" />
            }
            actions={
                <Button icon={<TrashIcon />}
                    onClick={deleteUser}>Delete User</Button>
            }
        >
            <NavigationTabs tabs={[
                {
                    key: 'details',
                    to: '',
                    end: true,
                    children: 'Details',
                },
                {
                    key: 'events',
                    to: 'events',
                    children: 'Events',
                },
                {
                    key: 'lists',
                    to: 'lists',
                    children: 'Lists',
                },
                {
                    key: 'subscriptions',
                    to: 'subscriptions',
                    children: 'Subscriptions',
                },
                {
                    key: 'journeys',
                    to: 'journeys',
                    children: 'Journeys',
                },
            ]} />
            <Outlet />
        </PageContent>
    )
}
