import { Outlet } from 'react-router-dom'
import PageContent from '../../ui/PageContent'
import { NavigationTabs } from '../../ui/Tabs'

export default function Settings() {

    const tabs = [
        {
            key: 'general',
            to: '',
            children: 'General',
        },
        {
            key: 'team',
            to: 'team',
            children: 'Team',
        },
        {
            key: 'apikeys',
            to: 'apikeys',
            children: 'Api Keys',
        },
        {
            key: 'integrations',
            to: 'integrations',
            children: 'Integrations',
        },
        {
            key: 'subscriptions',
            to: 'subscriptions',
            children: 'Subscriptions',
        },
    ]

    return (
        <PageContent title="Project Settings">
            <NavigationTabs tabs={tabs} />
            <Outlet />
        </PageContent>
    )
}
