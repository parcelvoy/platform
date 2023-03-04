import { Key, useState } from 'react'
import { Modifier, usePopper } from 'react-popper'

const modifiers: Array<Partial<Modifier<any, any>>> = [
    {
        name: 'preventOverflow',
        enabled: true,
        options: {
            padding: 10,
        },
    },
    {
        name: 'offset',
        options: {
            offset: [0, 4],
        },
    },
    {
        name: 'sameWidth',
        enabled: true,
        phase: 'beforeWrite',
        requires: ['computeStyles'],
        fn({ state }) {
            state.styles.popper.minWidth = `${state.rects.reference.width}px`
        },
        effect({ state }) {
            const reference = state.elements.reference as any as { offsetWidth: string }
            state.elements.popper.style.minWidth = `${reference.offsetWidth}px`
        },
    },
]

export function usePopperSelectDropdown() {

    const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null)
    const [popperElement, setPopperElement] = useState<HTMLElement | null>(null)
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        strategy: 'fixed',
        placement: 'bottom-start',
        modifiers,
    })

    return {
        setReferenceElement,
        setPopperElement,
        styles,
        attributes,
    }
}

export const defaultToValue = (option: any) => option

export const defaultGetValueKey = (option: any) => (typeof option === 'object' ? option.id : option) as Key

export const defaultGetOptionDisplay = (option: any) => (typeof option === 'object' ? option.label ?? option.name : option) as string
