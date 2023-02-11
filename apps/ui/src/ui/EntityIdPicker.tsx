import { Combobox, Transition } from '@headlessui/react'
import { useCallback, useState, ReactNode, Fragment } from 'react'
import useResolver from '../hooks/useResolver'
import { usePopper } from 'react-popper'
import { ControlledProps, SearchResult } from '../types'
import clsx from 'clsx'
import { CheckIcon } from './icons'

interface EntityIdPickerProps<T extends { id: number }> extends ControlledProps<number> {
    label: ReactNode
    required?: boolean
    get: (value: number) => Promise<T>
    search: (q: string) => Promise<SearchResult<T>>
    displayValue?: (entity: T) => string
}

const defaultDisplayValue = (item: any) => item.name

export function EntityIdPicker<T extends { id: number }>({
    displayValue = defaultDisplayValue,
    get,
    label,
    onChange,
    search,
    required,
    value,
}: EntityIdPickerProps<T>) {

    const [referenceElement, setReferenceElement] = useState<Element | null | undefined>()
    const [popperElement, setPopperElement] = useState<HTMLElement | null | undefined>()
    const { styles, attributes } = usePopper(referenceElement, popperElement)
    const [entity] = useResolver(useCallback(async () => value ? await get(value) : null, [get, value]))
    const [query, setQuery] = useState('')
    const [result] = useResolver(useCallback(async () => await search(query), [search, query]))

    return (
        <Combobox
            as='div'
            className='select'
            nullable
            value={entity}
            onChange={next => onChange(next?.id ?? 0)}
        >
            <Combobox.Label aria-required={required}>
                <span>
                    {label}
                    {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                </span>
            </Combobox.Label>
            <Combobox.Input
                displayValue={(value: T) => value && displayValue(value)}
                disabled={Boolean(value && !entity)}
                onChange={e => setQuery(e.target.value)}
                ref={setReferenceElement}
            />
            <Transition
                as={Fragment}
                leave="transition-leave"
                leaveFrom="transition-leave-from"
                leaveTo="transition-leave-to"
                enter="transition-enter"
                enterFrom="transition-enter-from"
                enterTo="transition-enter-to"
            >
                <Combobox.Options
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                    className='select-options'
                >
                    {
                        result?.results.map((option) => (
                            <Combobox.Option
                                key={option.id}
                                value={option}
                                className={({ active, selected }) => clsx('select-option', active && 'active', selected && 'selected')}
                            >
                                <span>
                                    {displayValue(option)}
                                </span>
                                <span className="option-icon">
                                    <CheckIcon aria-hidden="true" />
                                </span>
                            </Combobox.Option>
                        ))
                    }
                </Combobox.Options>
            </Transition>
        </Combobox>
    )
}
