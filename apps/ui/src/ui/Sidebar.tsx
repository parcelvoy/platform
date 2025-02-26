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
import Modal from './Modal'
import RadioInput from './form/RadioInput'
import { useTranslation } from 'react-i18next'

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
    const { t, i18n } = useTranslation()
    const profile = useContext(AdminContext)
    const [project] = useContext(ProjectContext)
    const [organization] = useContext(OrganizationContext)
    const navigate = useNavigate()
    const [preferences, setPreferences] = useContext(PreferencesContext)
    const [isOpen, setIsOpen] = useState(false)
    const [isLanguageOpen, setIsLanguageOpen] = useState(false)

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
                        <MenuItem onClick={() => navigate('/organization')}>{t('settings')}</MenuItem>
                        <MenuItem onClick={() => setIsLanguageOpen(true)}>{t('language')}</MenuItem>
                        <MenuItem onClick={() => setPreferences({ ...preferences, mode: preferences.mode === 'dark' ? 'light' : 'dark' })}>{preferences.mode === 'dark' ? t('light_mode') : t('dark_mode')}</MenuItem>
                        <MenuItem onClick={async () => await api.auth.logout()}>{t('sign_out')}</MenuItem>
                    </Menu>
                </div>}
            </section>
            <main className={clsx({ 'is-open': isOpen })}>
                {children}
            </main>

            <Modal open={isLanguageOpen} onClose={() => setIsLanguageOpen(false)} title={t('language')}>
                <RadioInput label={t('language')} options={[{ label: 'English', key: 'en' }, { label: 'Español', key: 'es' }, { label: '简体中文', key: 'zh' }]} value={i18n.language} onChange={(value) => {
                    setPreferences({ ...preferences, lang: value })
                }} />
            </Modal>
        </>
    )
}
