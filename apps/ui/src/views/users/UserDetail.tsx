import { useContext } from 'react'
import { UserContext } from '../../contexts'
import PageContent from '../../ui/PageContent'
import { NavigationTabs } from '../../ui/Tabs'
import { Outlet } from 'react-router'
import { InfoTable } from '../../ui/InfoTable'

export default function UserDetail() {

    const [{ external_id, email, phone, timezone, full_name }] = useContext(UserContext)

    return (
        <PageContent
            title={full_name ?? (email ?? 'No email')}
            desc={
                <InfoTable rows={{ ID: external_id, email, phone, timezone }} direction="horizontal" />
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
            ]} />
            <Outlet />
        </PageContent>
    )
}
