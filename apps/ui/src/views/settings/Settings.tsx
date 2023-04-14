import { Outlet } from 'react-router-dom'
import PageContent from '../../ui/PageContent'
import { NavigationTabs } from '../../ui/Tabs'
import { ProjectRoleRequired } from '../project/ProjectRoleRequired'

export default function Settings() {

    const tabs = [
        {
            key: 'general',
            to: '',
            end: true,
            children: 'General',
        },
        {
            key: 'team',
            to: 'team',
            children: 'Team',
        },
        {
            key: 'api-keys',
            to: 'api-keys',
            children: 'API Keys',
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
        {
            key: 'tags',
            to: 'tags',
            children: 'Tags',
        },
        {
            key: 'performance',
            to: 'performance',
            children: 'Performance',
        },
    ]

    return (
        <ProjectRoleRequired minRole="admin">
            <PageContent title="Settings">
                <NavigationTabs tabs={tabs} />
                <Outlet />
            </PageContent>
        </ProjectRoleRequired>
    )
}
