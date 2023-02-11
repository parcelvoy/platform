import { Listbox, Transition } from '@headlessui/react'
import { Fragment, Key, useEffect, useId, useMemo, useState } from 'react'
import { CheckIcon, ChevronUpDownIcon } from '../icons'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { FieldOption, FieldProps } from './Field'
import './SelectField.css'
import { Modifier } from '@popperjs/core'
import { usePopper } from 'react-popper'

interface OptionFieldProps<X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P> {
    options: FieldOption[]
    value?: Key
    onChange?: (value: Key) => void
    size?: 'small' | 'regular'
}

export default function SelectField<X extends FieldValues, P extends FieldPath<X>>(props: OptionFieldProps<X, P>) {
    const id = useId()
    const { form, label, name, options, size = 'regular' } = props
    let { value, onChange } = props
    if (form) {
        const { field } = useController({ name, control: form?.control })
        value = field.value
        onChange = field.onChange
    }

    const [referenceElement, setReferenceElement] = useState<Element | null | undefined>()
    const [popperElement, setPopperElement] = useState<HTMLElement | null | undefined>()

    const modifiers = useMemo<Array<Partial<Modifier<any, any>>>>(
        () => [
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
                    offset: [0, -12],
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
        ],
        [],
    )

    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        strategy: 'fixed',
        placement: 'bottom-start',
        modifiers,
    })

    // Get an internal default value based on options list
    const [defaultValue, setDefaultValue] = useState<FieldOption>({ key: id, label: 'Loading...' })
    useEffect(() => {
        const option = options.find(item => value && item.key === value) ?? options[0]
        setDefaultValue(option)
        if (!value && options.length > 0) {
            onChange?.(option.key)
        }
    }, [value, options])

    return (
        <div className="ui-select">
            <Listbox
                value={defaultValue}
                onChange={(value) => onChange?.(value.key) }
                name={name}>
                {label && <Listbox.Label>
                    <span>
                        {label}
                        {props.required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                    </span>
                </Listbox.Label>}
                <Listbox.Button className={`select-button ${size}`} ref={setReferenceElement}>
                    <span className="select-button-label">{defaultValue?.label}</span>
                    <span className="select-button-icon">
                        <ChevronUpDownIcon aria-hidden="true" />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition-leave"
                    leaveFrom="transition-leave-from"
                    leaveTo="transition-leave-to"
                    enter="transition-enter"
                    enterFrom="transition-enter-from"
                    enterTo="transition-enter-to"
                >
                    <Listbox.Options
                        className="select-options"
                        ref={setPopperElement}
                        style={styles.popper}
                        {...attributes.popper}>
                        {options.map((option) => (
                            <Listbox.Option
                                key={option.key}
                                value={option}
                                className={
                                    ({ active, selected }) => `select-option ${active ? 'active' : ''} ${selected ? 'selected' : ''}` }
                            >
                                <span>{option.label}</span>
                                <span className="option-icon">
                                    <CheckIcon aria-hidden="true" />
                                </span>
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </Listbox>
        </div>
    )
}
