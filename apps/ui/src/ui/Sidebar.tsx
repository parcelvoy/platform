import './Sidebar.css'
import NavLink from './NavLink'
import { ReactComponent as Logo } from '../assets/parcelvoy.svg'
import { Link, NavLinkProps } from 'react-router-dom'
import { PropsWithChildren, useContext } from 'react'
import { AdminContext } from '../contexts'
import api from '../api'
import { PreferencesContext } from './PreferencesContext'

interface SidebarProps {
    links?: Array<NavLinkProps & { key: string, icon: string }>
}

export default function Sidebar({ children, links }: PropsWithChildren<SidebarProps>) {
    const profile = useContext(AdminContext)
    const [preferences, setPreferences] = useContext(PreferencesContext)
    return (
        <>
            <section className="sidebar">
                <Link to='/'>
                    <Logo className="logo" />
                </Link>
                <nav>
                    {
                        links?.map(({ key, ...props }) => (
                            <NavLink {...props} key={key} />
                        ))
                    }
                </nav>
                {
                    profile && (
                        <div className="profile">
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
