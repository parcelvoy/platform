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
import { useTranslation } from 'react-i18next'

export default function UserDetail() {

    const { t } = useTranslation()
    const navigate = useNavigate()
    const [project] = useContext(ProjectContext)
    const [{ id, external_id, email, phone, timezone, full_name }] = useContext(UserContext)

    const deleteUser = async () => {
        if (confirm(t('delete_user_confirmation'))) {
            await api.users.delete(project.id, id)
            navigate(`/projects/${project.id}/users`)
        }
    }

    return (
        <PageContent
            title={full_name ?? (email ?? 'No email')}
            desc={
                <InfoTable rows={{
                    ID: external_id,
                    [t('email')]: email,
                    [t('phone')]: phone,
                    [t('timezone')]: timezone,
                }} direction="horizontal" />
            }
            actions={
                <Button icon={<TrashIcon />}
                    onClick={deleteUser}
                    variant="destructive">{t('delete_user')}</Button>
            }
        >
            <NavigationTabs tabs={[
                {
                    key: 'details',
                    to: '',
                    end: true,
                    children: t('details'),
                },
                {
                    key: 'events',
                    to: 'events',
                    children: t('events'),
                },
                {
                    key: 'lists',
                    to: 'lists',
                    children: t('lists'),
                },
                {
                    key: 'subscriptions',
                    to: 'subscriptions',
                    children: t('subscriptions'),
                },
                {
                    key: 'journeys',
                    to: 'journeys',
                    children: t('journeys'),
                },
            ]} />
            <Outlet />
        </PageContent>
    )
}
