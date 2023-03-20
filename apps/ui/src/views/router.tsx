import { createBrowserRouter, Outlet, redirect, useNavigate, useParams } from 'react-router-dom'
import api from '../api'

import ErrorPage from './ErrorPage'
import Sidebar from '../ui/Sidebar'
import { LoaderContextProvider, StatefulLoaderContextProvider } from './LoaderContextProvider'
import { AdminContext, CampaignContext, JourneyContext, ListContext, ProjectContext, UserContext } from '../contexts'
import PageContent from '../ui/PageContent'
import { NavigationTabs } from '../ui/Tabs'
import ApiKeys from './settings/ApiKeys'
import EmailEditor from './campaign/EmailEditor'
import Lists from './users/Lists'
import ListDetail from './users/ListDetail'
import Users from './users/Users'
import Teams from './settings/Teams'
import Subscriptions from './settings/Subscriptions'
import UserDetail from './users/UserDetail'
import { createStatefulRoute } from './createStatefulRoute'
import UserDetailAttrs from './users/UserDetailAttrs'
import UserDetailEvents from './users/UserDetailEvents'
import UserDetailLists from './users/UserDetailLists'
import UserDetailSubscriptions from './users/UserDetailSubscriptions'
import CampaignDetail from './campaign/CampaignDetail'
import Campaigns from './campaign/Campaigns'
import CampaignDelivery from './campaign/CampaignDelivery'
import CampaignPreview from './campaign/CampaignPreview'
import CampaignOverview from './campaign/CampaignOverview'
import CampaignDesign from './campaign/CampaignDesign'
import Journeys from './journey/Journeys'
import JourneyEditor from './journey/JourneyEditor'
import ProjectSettings from './settings/ProjectSettings'
import Integrations from './settings/Integrations'
import Tags from './settings/Tags'
import Login from './auth/Login'
import OnboardingStart from './auth/OnboardingStart'
import Onboarding from './auth/Onboarding'
import OnboardingProject from './auth/OnboardingProject'
import { CampaignsIcon, JourneysIcon, ListsIcon, SettingsIcon, UsersIcon } from '../ui/icons'
import { Projects } from './project/Projects'
import { pushRecentProject } from '../utils'

export const useRoute = (includeProject = true) => {
    const { projectId = '' } = useParams()
    const navigate = useNavigate()
    const parts: string[] = []
    if (includeProject) {
        parts.push('projects', projectId)
    }
    return (path: string) => {
        parts.push(path)
        navigate('/' + parts.join('/'))
    }
}

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '*',
        errorElement: <ErrorPage />,
        loader: async () => await api.profile.get(),
        element: (
            <LoaderContextProvider context={AdminContext}>
                <Outlet />
            </LoaderContextProvider>
        ),
        children: [
            {
                index: true,
                element: (
                    <Projects />
                ),
            },
            {
                path: 'onboarding',
                element: <Onboarding />,
                children: [
                    {
                        index: true,
                        element: <OnboardingStart />,
                    },
                    {
                        path: 'project',
                        element: <OnboardingProject />,
                    },
                ],
            },
            {
                path: 'projects/:projectId',
                loader: async ({ params: { projectId = '' } }) => {
                    const project = await api.projects.get(projectId)
                    pushRecentProject(project.id)
                    return project
                },
                element: (
                    <StatefulLoaderContextProvider context={ProjectContext}>
                        <Sidebar
                            links={[
                                {
                                    key: 'campaigns',
                                    to: 'campaigns',
                                    children: 'Campaigns',
                                    icon: <CampaignsIcon />,
                                    minRole: 'editor',
                                },
                                {
                                    key: 'journeys',
                                    to: 'journeys',
                                    children: 'Journeys',
                                    icon: <JourneysIcon />,
                                    minRole: 'editor',
                                },
                                {
                                    key: 'users',
                                    to: 'users',
                                    children: 'Users',
                                    icon: <UsersIcon />,
                                },
                                {
                                    key: 'lists',
                                    to: 'lists',
                                    children: 'Lists',
                                    icon: <ListsIcon />,
                                    minRole: 'editor',
                                },
                                {
                                    key: 'settings',
                                    to: 'settings',
                                    children: 'Settings',
                                    icon: <SettingsIcon />,
                                    minRole: 'admin',
                                },
                            ]}
                        >
                            <Outlet />
                        </Sidebar>
                    </StatefulLoaderContextProvider>
                ),
                children: [
                    {
                        index: true,
                        loader: async () => {
                            return redirect('campaigns')
                        },
                    },
                    createStatefulRoute({
                        path: 'campaigns',
                        apiPath: api.campaigns,
                        element: <Campaigns />,
                    }),
                    createStatefulRoute({
                        path: 'campaigns/:entityId',
                        apiPath: api.campaigns,
                        context: CampaignContext,
                        element: <CampaignDetail />,
                        children: [
                            {
                                index: true,
                                element: <CampaignOverview />,
                            },
                            {
                                path: 'design',
                                element: <CampaignDesign />,
                            },
                            {
                                path: 'delivery',
                                element: <CampaignDelivery />,
                            },
                            {
                                path: 'preview',
                                element: <CampaignPreview />,
                            },
                        ],
                    }),
                    createStatefulRoute({
                        path: 'campaigns/:entityId/editor',
                        apiPath: api.campaigns,
                        context: CampaignContext,
                        element: (<EmailEditor />),
                    }),
                    createStatefulRoute({
                        path: 'journeys',
                        apiPath: api.journeys,
                        element: <Journeys />,
                    }),
                    createStatefulRoute({
                        path: 'journeys/:entityId',
                        apiPath: api.journeys,
                        context: JourneyContext,
                        element: <JourneyEditor />,
                    }),
                    createStatefulRoute({
                        path: 'users',
                        apiPath: api.users,
                        element: <Users />,
                    }),
                    createStatefulRoute({
                        path: 'users/:entityId',
                        apiPath: api.users,
                        context: UserContext,
                        element: <UserDetail />,
                        children: [
                            {
                                index: true,
                                element: <UserDetailAttrs />,
                            },
                            {
                                path: 'events',
                                element: <UserDetailEvents />,
                            },
                            {
                                path: 'lists',
                                element: <UserDetailLists />,
                            },
                            {
                                path: 'subscriptions',
                                element: <UserDetailSubscriptions />,
                            },
                        ],
                    }),
                    createStatefulRoute({
                        path: 'lists',
                        apiPath: api.lists,
                        element: <Lists />,
                    }),
                    createStatefulRoute({
                        path: 'lists/:entityId',
                        apiPath: api.lists,
                        context: ListContext,
                        element: <ListDetail />,
                    }),
                    {
                        path: 'settings',
                        element: (
                            <PageContent title="Settings">
                                <NavigationTabs
                                    tabs={[
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
                                    ]}
                                />
                                <Outlet />
                            </PageContent>
                        ),
                        children: [
                            {
                                index: true,
                                element: <ProjectSettings />,
                            },
                            {
                                path: 'team',
                                element: <Teams />,
                            },
                            {
                                path: 'api-keys',
                                element: <ApiKeys />,
                            },
                            {
                                path: 'integrations',
                                element: <Integrations />,
                            },
                            {
                                path: 'subscriptions',
                                element: <Subscriptions />,
                            },
                            {
                                path: 'tags',
                                element: <Tags />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
])
