import * as React from 'react'
import { NavLink as BaseNavLink, NavLinkProps as BaseNavLinkProps } from 'react-router-dom'

export type NavLinkProps = BaseNavLinkProps & { key: string, icon?: string }

const NavLink = React.forwardRef(
    function NavLink({ ...props }: NavLinkProps, ref: React.Ref<HTMLAnchorElement> | undefined) {
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
                    {props.icon && <i className={`bi ${props.icon}`} />}
                    &nbsp;
                    {props.children}
                </>
            </BaseNavLink>
        )
    },
)

export default NavLink
