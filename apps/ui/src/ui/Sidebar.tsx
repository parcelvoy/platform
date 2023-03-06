import './Sidebar.css'
import NavLink from './NavLink'
import { ReactComponent as Logo } from '../assets/logo.svg'
import { Link, NavLinkProps, useNavigate } from 'react-router-dom'
import { PropsWithChildren, useContext } from 'react'
import { AdminContext, ProjectContext } from '../contexts'
import api from '../api'
import { PreferencesContext } from './PreferencesContext'
import { useResolver } from '../hooks'
import { SingleSelect } from './form/SingleSelect'
import Button, { LinkButton } from './Button'
import ButtonGroup from './ButtonGroup'

interface SidebarProps {
    links?: Array<NavLinkProps & { key: string, icon: string }>
}

export default function Sidebar({ children, links }: PropsWithChildren<SidebarProps>) {
    const navigate = useNavigate()
    const profile = useContext(AdminContext)
    const [project] = useContext(ProjectContext)
    const [preferences, setPreferences] = useContext(PreferencesContext)
    const [projects] = useResolver(api.projects.all)

    return (
        <>
            <section className="sidebar">
                <div className="sidebar-header">
                    <Link className="logo" to="/">
                        <Logo />
                    </Link>
                </div>
                <SingleSelect
                    value={project}
                    onChange={project => navigate(`/projects/${project.id}`)}
                    options={projects ?? [project]}
                    getSelectedOptionDisplay={p => (
                        <>
                            <div className="project-switcher-label">Project</div>
                            <div className="project-switcher-value">{p.name}</div>
                        </>
                    )}
                    hideLabel
                    buttonClassName="project-switcher"
                    variant="minimal"
                    optionsFooter={
                        <div
                            style={{
                                borderTop: '1px solid var(--color-grey)',
                                paddingTop: '10px',
                                textAlign: 'center',
                            }}
                        >
                            <LinkButton size="small" variant="primary" to="/projects/new" icon="plus">
                                {'Create Project'}
                            </LinkButton>
                        </div>
                    }
                />
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
                                <ButtonGroup>
                                    <Button
                                        variant="plain"
                                        size="small"
                                        icon={preferences.mode === 'dark' ? 'moon' : 'sun'}
                                        onClick={() => setPreferences({ ...preferences, mode: preferences.mode === 'dark' ? 'light' : 'dark' })}
                                    />
                                    <Button
                                        variant="plain"
                                        size="small"
                                        onClick={async () => await api.logout()}
                                    >
                                        {'Sign Out'}
                                    </Button>
                                </ButtonGroup>
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
