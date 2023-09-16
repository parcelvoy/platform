import { NavLinkProps, useNavigate } from 'react-router-dom'
import { PropsWithChildren, ReactNode, useCallback, useContext } from 'react'
import { AdminContext, ProjectContext } from '../../contexts'
import api from '../../api'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { useResolver } from '../../hooks'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { checkProjectRole, getRecentProjects, snakeToTitle } from '../../utils'
import { ProjectRole } from '../../types'
import Menu, { MenuItem } from '../../ui/Menu'
import Sidebar from '../../ui/Sidebar'
import { ChevronDownIcon } from '../../ui/icons'

interface SidebarProps {
    links?: Array<NavLinkProps & {
        key: string
        icon: ReactNode
        minRole?: ProjectRole
    }>
    prepend?: ReactNode
    append?: ReactNode
}

export default function ProjectSidebar({ children, links }: PropsWithChildren<SidebarProps>) {
    const navigate = useNavigate()
    const profile = useContext(AdminContext)
    const [project] = useContext(ProjectContext)
    const [preferences, setPreferences] = useContext(PreferencesContext)
    const [recents] = useResolver(useCallback(async () => {
        const recentIds = getRecentProjects().filter(p => p.id !== project.id).map(p => p.id)
        const recents: Array<typeof project> = []
        if (recentIds.length) {
            const projects = await api.projects.search({
                limit: recentIds.length,
                id: recentIds,
            }).then(r => r.results ?? [])
            for (const id of recentIds) {
                const recent = projects.find(p => p.id === id)
                if (recent) {
                    recents.push(recent)
                }
            }
        }
        return [
            project,
            ...recents,
            {
                id: 0,
                name: 'View All',
            },
        ]
    }, [project]))

    return (
        project && <Sidebar
            links={links?.filter(({ minRole }) => !minRole || checkProjectRole(minRole, project.role))}
            prepend={
                <SingleSelect
                    value={project}
                    onChange={project => {
                        if (project.id === 0) {
                            navigate('/organization/projects')
                        } else {
                            navigate(`/projects/${project.id}`)
                        }
                    }}
                    options={recents ?? []}
                    getSelectedOptionDisplay={p => (
                        <>
                            <div className="project-switcher-label">Project</div>
                            <div className="project-switcher-value">{p.name}</div>
                        </>
                    )}
                    hideLabel
                    buttonClassName="project-switcher"
                    variant="minimal"
                />
            }
            append={
                profile && (
                    <div className="sidebar-profile">
                        <Menu button={
                            <div className="sidebar-profile-inner">
                                <div className="profile-image">
                                    <img src={profile.image_url} referrerPolicy="no-referrer" />
                                </div>
                                <span className="profile-name">{`${profile.first_name} ${profile.last_name}`}</span>
                                <div className="profile-role">{snakeToTitle(project.role ?? 'support')}</div>
                                <div className="profile-caret">
                                    <ChevronDownIcon />
                                </div>
                            </div>
                        }>
                            <MenuItem onClick={() => navigate('/organization')}>Settings</MenuItem>
                            <MenuItem onClick={() => setPreferences({ ...preferences, mode: preferences.mode === 'dark' ? 'light' : 'dark' })}>Use {preferences.mode === 'dark' ? 'Light' : 'Dark'} Theme</MenuItem>
                            <MenuItem onClick={async () => await api.auth.logout()}>Sign Out</MenuItem>
                        </Menu>
                    </div>
                )
            }
        >{children}</Sidebar>
    )
}
