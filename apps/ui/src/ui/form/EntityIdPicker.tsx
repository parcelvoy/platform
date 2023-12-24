import { Combobox } from '@headlessui/react'
import { useCallback, useState, RefCallback, ReactNode } from 'react'
import { useResolver } from '../../hooks'
import { ControlledInputProps, SearchResult } from '../../types'
import clsx from 'clsx'
import { CheckIcon, ChevronUpDownIcon, CloseIcon, EditIcon, PlusIcon } from '../icons'
import { usePopperSelectDropdown } from '../utils'
import { FieldProps } from './Field'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import Button from '../Button'
import Modal, { ModalProps } from '../Modal'

interface EntityIdPickerProps<T extends { id: number }> extends ControlledInputProps<number> {
    get: (value: number) => Promise<T>
    search: (q: string) => Promise<SearchResult<T>>
    displayValue?: (entity: T) => string
    optionEnabled?: (entity: T) => boolean
    size?: 'small' | 'regular'
    onBlur?: (event: any) => void
    inputRef?: RefCallback<HTMLInputElement>
    createModalSize?: ModalProps['size']
    renderCreateForm?: (onCreated: (created: T) => void) => ReactNode
    onEditLink?: (item: T) => void
}

const defaultDisplayValue = (item: any) => item.name
const defaultOptionEnabled = () => true

export function EntityIdPicker<T extends { id: number }>({
    createModalSize,
    disabled,
    displayValue = defaultDisplayValue,
    get,
    inputRef,
    label,
    onChange,
    onBlur,
    onEditLink,
    optionEnabled = defaultOptionEnabled,
    renderCreateForm,
    search,
    size,
    subtitle,
    required,
    value,
}: EntityIdPickerProps<T>) {

    const [entity] = useResolver(useCallback(async () => value ? await get(value) : null, [get, value]))
    const [query, setQuery] = useState('')
    const [result] = useResolver(useCallback(async () => await search(query), [search, query]))
    const {
        setReferenceElement,
        setPopperElement,
        attributes,
        styles,
    } = usePopperSelectDropdown()
    const [open, setOpen] = useState(false)

    return (
        <Combobox
            as="div"
            className="ui-select"
            nullable
            disabled={disabled}
            value={entity}
            onChange={next => onChange(next?.id ?? 0)}
        >
            <Combobox.Label aria-required={required}>
                <span>
                    {label}
                    {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                </span>
                {subtitle && <span className="label-subtitle">{subtitle}</span>}
            </Combobox.Label>
            <div className="ui-button-group">
                <span className={clsx('ui-text-input', size ?? 'regular', { disabled })} style={{ flexGrow: 1 }}>
                    <Combobox.Input
                        displayValue={(value: T) => value && displayValue(value)}
                        onChange={e => setQuery(e.target.value)}
                        onBlur={onBlur}
                        ref={(input: HTMLInputElement) => {
                            setReferenceElement(input)
                            inputRef?.(input)
                        }}
                    />
                </span>
                {
                    !!(value && !required) && (
                        <Button
                            icon={<CloseIcon />}
                            variant="secondary"
                            size={size}
                            onClick={() => onChange(0)} // set to '0' to clear? or null?
                        />
                    )
                }
                <Combobox.Button className={clsx('ui-button', 'secondary', size ?? 'regular')}>
                    <ChevronUpDownIcon />
                </Combobox.Button>
                {
                    !!(onEditLink && entity) && (
                        <Button
                            icon={<EditIcon />}
                            variant="secondary"
                            size={size}
                            disabled={!entity}
                            onClick={() => onEditLink(entity)}
                        />
                    )
                }
                {
                    renderCreateForm && (
                        <>
                            <Button
                                variant="secondary"
                                size={size}
                                onClick={() => setOpen(true)}
                                icon={<PlusIcon />}
                            />
                            <Modal
                                open={open}
                                onClose={setOpen}
                                title="Create"
                                size={createModalSize}
                            >
                                {renderCreateForm(created => {
                                    setOpen(false)
                                    onChange(created.id)
                                })}
                            </Modal>
                        </>
                    )
                }
            </div>
            <Combobox.Options className="select-options nowheel"
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}>
                {
                    result?.results.map((option) => (
                        <Combobox.Option
                            key={option.id}
                            value={option}
                            className={({ active, disabled, selected }) => clsx(
                                'select-option',
                                active && 'active',
                                disabled && 'disabled',
                                selected && 'selected',
                            )}
                            disabled={!optionEnabled(option)}
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
        </Combobox>
    )
}

interface EntityIdPickerFieldProps<T extends { id: number }, X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P>, Omit<EntityIdPickerProps<T>, 'value' | 'onChange'> {

}

/**
 * react-hook-form bindings
 */
EntityIdPicker.Field = function EntityIdPickerField<T extends { id: number }, X extends FieldValues, P extends FieldPath<X>>({
    form,
    name,
    disabled,
    required,
    ...rest
}: EntityIdPickerFieldProps<T, X, P>) {
    const { field: { ref, ...field } } = useController({
        control: form!.control,
        name,
        rules: {
            required,
        },
    })

    return (
        <EntityIdPicker
            {...rest}
            {...field}
            inputRef={ref}
            required={required}
            disabled={disabled}
        />
    )
}
