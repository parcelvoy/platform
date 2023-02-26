import './Sidebar.css'
import NavLink from './NavLink'
import { ReactComponent as Logo } from '../assets/logo-icon.svg'
import { Link, NavLinkProps, useNavigate } from 'react-router-dom'
import { PropsWithChildren, useCallback, useContext } from 'react'
import { AdminContext, ProjectContext } from '../contexts'
import api from '../api'
import { PreferencesContext } from './PreferencesContext'
import { Listbox } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from './icons'
import useResolver from '../hooks/useResolver'
import { LinkButton } from './Button'

interface SidebarProps {
    links?: Array<NavLinkProps & { key: string, icon: string }>
}

export default function Sidebar({ children, links }: PropsWithChildren<SidebarProps>) {
    const navigate = useNavigate()
    const profile = useContext(AdminContext)
    const [project] = useContext(ProjectContext)
    const [preferences, setPreferences] = useContext(PreferencesContext)
    const [projects] = useResolver(useCallback(async () => await api.projects.all(), []))

    return (
        <>
            <section className="sidebar">
                <div className="sidebar-header">
                    <Link className="logo" to='/'>
                        <Logo />
                    </Link>
                    <div className="project-switcher">
                        <Listbox
                            value={project}
                            onChange={(project) => navigate(`/projects/${project.id}`)}>
                            <Listbox.Button className="switcher-button">
                                <div className="switcher-text">
                                    <span className="switcher-label">Project</span>
                                    <span className="switcher-value">{project.name}</span>
                                </div>
                                <span className="project-switcher-icon">
                                    <ChevronUpDownIcon aria-hidden="true" />
                                </span>
                            </Listbox.Button>

                            <Listbox.Options className="switcher-options">
                                {projects?.map((project) => (
                                    <Listbox.Option
                                        key={project.id}
                                        value={project}
                                        className={
                                            ({ active, selected }) => `switcher-option ${active ? 'active' : ''} ${selected ? 'selected' : ''}` }
                                    >
                                        <span>{project.name}</span>
                                        <span className="option-icon">
                                            <CheckIcon aria-hidden="true" />
                                        </span>
                                    </Listbox.Option>
                                ))}
                                <div className="switcher-option disabled">
                                    <LinkButton size="small" icon="plus-lg" to="/projects/new">Create New Project</LinkButton>
                                </div>
                            </Listbox.Options>
                        </Listbox>
                    </div>
                </div>
                <nav>
                    {
                        links?.map(({ key, ...props }) => (
                            <NavLink {...props} key={key} />
                        ))
                    }
                </nav>
                {
                    profile && (
                        <div className="sidebar-profile">
                            <div className="profile-image"></div>
                            <span className="profile-name">{`${profile.first_name} ${profile.last_name}`}</span>
                            <span className="profile-role">
                                <button onClick={async () => await api.logout()}>
                                    Sign Out
                                </button>
                                <button onClick={() => {
                                    setPreferences({ ...preferences, mode: preferences.mode === 'dark' ? 'light' : 'dark' })
                                }}>Toggle Theme</button>
                            </span>
                        </div>
                    )
                }
            </section>
            <main>
                {children}
            </main>
        </>
    )
}
