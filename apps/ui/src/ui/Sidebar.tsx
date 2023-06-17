import './Sidebar.css'
import NavLink from './NavLink'
import { ReactComponent as Logo } from '../assets/logo.svg'
import { Link, NavLinkProps } from 'react-router-dom'
import { PropsWithChildren, ReactNode, useState } from 'react'
import Button from './Button'
import { MenuIcon } from './icons'
import clsx from 'clsx'

interface SidebarProps {
    links?: Array<NavLinkProps & {
        key: string
        icon: ReactNode
    }>
    prepend?: ReactNode
    append?: ReactNode
}

export default function Sidebar({ children, links, prepend, append }: PropsWithChildren<SidebarProps>) {
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
            </section>
            <main className={clsx({ 'is-open': isOpen })}>
                {children}
            </main>
        </>
    )
}
