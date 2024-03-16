import './Sidebar.css'
import NavLink from './NavLink'
import { ReactComponent as Logo } from '../assets/logo.svg'
import { Link, NavLinkProps, useNavigate } from 'react-router-dom'
import { PropsWithChildren, ReactNode, useContext, useState } from 'react'
import Button from './Button'
import { ChevronDownIcon, MenuIcon } from './icons'
import clsx from 'clsx'
import Menu, { MenuItem } from './Menu'
import { AdminContext, OrganizationContext, ProjectContext } from '../contexts'
import { PreferencesContext } from './PreferencesContext'
import api from '../api'
import { snakeToTitle } from '../utils'

export interface SidebarLink extends NavLinkProps {
    key: string
    icon: ReactNode
}

interface SidebarProps {
    links?: SidebarLink[]
    prepend?: ReactNode
    append?: ReactNode
}

export default function Sidebar({ children, links, prepend, append }: PropsWithChildren<SidebarProps>) {
    const profile = useContext(AdminContext)
    const [project] = useContext(ProjectContext)
    const [organization] = useContext(OrganizationContext)
    const navigate = useNavigate()
    const [preferences, setPreferences] = useContext(PreferencesContext)
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <header className="header">
                <Button onClick={() => setIsOpen(!isOpen)} icon={<MenuIcon />} aria-label="Menu" variant="secondary" size="small"/>
                <Link className="logo" to="/">
                    <Logo />
                </Link>
            </header>
            <section className={clsx('sidebar', { 'is-open': isOpen })}>
                <div className="sidebar-header">
                    <Link className="logo" to="/">
                        <Logo />
                    </Link>
                </div>
                {prepend}
                <nav>
                    {
                        links?.map(({ key, ...props }) => (
                            <NavLink {...props} key={key} onClick={() => setIsOpen(false)} />
                        ))
                    }
                </nav>
                {append}
                {profile && <div className="sidebar-profile">
                    <Menu button={
                        <div className="sidebar-profile-inner">
                            <div className="profile-image">
                                <img src={profile.image_url} referrerPolicy="no-referrer" />
                            </div>
                            <span className="profile-name">
                                {
                                    profile.first_name
                                        ? `${profile.first_name} ${profile.last_name}`
                                        : 'User'
                                }
                            </span>
                            <div className="profile-role">{snakeToTitle(project.role ?? organization.username)}</div>
                            <div className="profile-caret">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    }>
                        <MenuItem onClick={() => navigate('/organization')}>Settings</MenuItem>
                        <MenuItem onClick={() => setPreferences({ ...preferences, mode: preferences.mode === 'dark' ? 'light' : 'dark' })}>Use {preferences.mode === 'dark' ? 'Light' : 'Dark'} Theme</MenuItem>
                        <MenuItem onClick={async () => await api.auth.logout()}>Sign Out</MenuItem>
                    </Menu>
                </div>}
            </section>
            <main className={clsx({ 'is-open': isOpen })}>
                {children}
            </main>
        </>
    )
}
