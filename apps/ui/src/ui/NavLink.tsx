import * as React from 'react'
import { NavLink as BaseNavLink, NavLinkProps as BaseNavLinkProps } from 'react-router-dom'

export type NavLinkProps = BaseNavLinkProps & { key: string, icon?: React.ReactNode }

const NavLink = React.forwardRef(
    function NavLink({ icon, ...props }: NavLinkProps, ref: React.Ref<HTMLAnchorElement> | undefined) {
        return (
            <BaseNavLink
                ref={ref}
                {...props}
                className={({ isActive }) =>
                    [
                        props.className,
                        isActive ? 'selected' : null,
                    ]
                        .filter(Boolean)
                        .join(' ')
                }
            >
                <>
                    {icon && (<div className="nav-icon">{icon}</div>)}
                    {props.children}
                </>
            </BaseNavLink>
        )
    },
)

export default NavLink
