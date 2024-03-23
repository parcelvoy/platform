import { AdminContext, OrganizationContext } from '../../contexts'
import { useContext } from 'react'
import Sidebar, { SidebarLink } from '../../ui/Sidebar'
import { PerformanceIcon, ProjectIcon, SettingsIcon, UsersIcon } from '../../ui/icons'
import { checkOrganizationRole } from '../../utils'
import { StatefulLoaderContextProvider } from '../LoaderContextProvider'
import { OrganizationRole } from '../../types'
import { Outlet } from 'react-router-dom'

type OrganizationLink = SidebarLink & { minRole?: OrganizationRole }
interface OrganizationProps {
    filter: (links: OrganizationLink[]) => OrganizationLink[]
}

export default function Organization({ filter }: OrganizationProps) {
    const admin = useContext(AdminContext)
    const defaultLinks: OrganizationLink[] = [
        {
            key: 'projects',
            to: 'projects',
            children: 'Projects',
            icon: <ProjectIcon />,
        },
        {
            key: 'admins',
            to: 'admins',
            children: 'Admins',
            icon: <UsersIcon />,
            minRole: 'admin',
        },
        {
            key: 'performance',
            to: 'performance',
            children: 'Performance',
            icon: <PerformanceIcon />,
            minRole: 'admin',
        },
        {
            key: 'settings',
            to: 'settings',
            children: 'Settings',
            icon: <SettingsIcon />,
            minRole: 'admin',
        },
    ]
    const filteredLinks = filter(defaultLinks).filter(({ minRole }) => !minRole || checkOrganizationRole(minRole, admin?.role))

    return (
        <StatefulLoaderContextProvider context={OrganizationContext}>
            <Sidebar links={filteredLinks}>
                <Outlet />
            </Sidebar>
        </StatefulLoaderContextProvider>
    )
}
