import { PropsWithChildren, useState } from 'react'
import { Popover } from '@headlessui/react'
import { usePopper } from 'react-popper'
import Button, { ButtonSize, ButtonVariant } from './Button'
import './Menu.css'
import { Placement } from '@popperjs/core'
import { ThreeDotsIcon } from './icons'

interface MenuProps {
    thing?: string
    variant?: ButtonVariant
    size?: ButtonSize
    placement?: Placement
}

interface MenuItemProps {
    onClick?: () => void
}

export function MenuItem({ children, onClick }: PropsWithChildren<MenuItemProps>) {
    return (
        <div className="ui-menu-item"
            onClick={(event) => {
                onClick?.()
                event.preventDefault()
                event.stopPropagation()
            }}>{ children }</div>
    )
}

export default function Menu({ children, variant, size, placement }: PropsWithChildren<MenuProps>) {
    const [referenceElement, setReferenceElement] = useState<Element | null | undefined>()
    const [popperElement, setPopperElement] = useState<HTMLElement | null | undefined>()
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: placement ?? 'bottom-end',
    })

    return (
        <Popover>
            <Popover.Button as={Button}
                ref={setReferenceElement}
                variant={variant ?? 'plain'}
                size={size}
                icon={<ThreeDotsIcon />}></Popover.Button>

            <Popover.Panel
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
                className="ui-menu"
            >
                {children}
            </Popover.Panel>
        </Popover>
    )
}
