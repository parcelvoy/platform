import { Listbox } from '@headlessui/react'
import { ReactNode } from 'react'
import { CheckIcon, ChevronUpDownIcon } from '../icons'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import './Select.css'
import { defaultGetOptionDisplay, defaultGetValueKey, defaultToValue, usePopperSelectDropdown } from '../utils'
import { ControlledInputProps, FieldBindingsProps, OptionsProps } from '../../types'
import clsx from 'clsx'

export interface SingleSelectProps<T, O = T> extends ControlledInputProps<T>, OptionsProps<O, T> {
    className?: string
    buttonClassName?: string
    getSelectedOptionDisplay?: (option: O) => ReactNode
    onBlur?: () => void
    optionsFooter?: ReactNode
    size?: 'small' | 'regular'
    variant?: 'plain' | 'minimal'
}

export function SingleSelect<T, U = T>({
    buttonClassName,
    className,
    disabled,
    error,
    getOptionDisplay = defaultGetOptionDisplay,
    getSelectedOptionDisplay = getOptionDisplay,
    hideLabel,
    label,
    options,
    optionsFooter,
    onBlur,
    onChange,
    required,
    size,
    subtitle,
    toValue = defaultToValue,
    getValueKey = defaultGetValueKey,
    value,
    variant,
}: SingleSelectProps<T, U>) {

    const {
        setReferenceElement,
        setPopperElement,
        attributes,
        styles,
    } = usePopperSelectDropdown()

    const selectedOption = options.find(o => Object.is(getValueKey(toValue(o)), getValueKey(value)))

    return (
        <Listbox
            as="div"
            className={clsx('ui-select', className, variant ?? 'plain')}
            by={(left: T, right: T) => Object.is(getValueKey(left), getValueKey(right))}
            disabled={disabled}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
        >
            {
                label && (
                    <Listbox.Label style={hideLabel ? { display: 'none' } : undefined}>
                        <span>
                            {label}
                            {
                                required && (
                                    <span style={{ color: 'red' }}>&nbsp;*</span>
                                )
                            }
                        </span>
                    </Listbox.Label>
                )
            }
            {
                subtitle && (
                    <span className="label-subtitle">
                        {subtitle}
                    </span>
                )
            }
            <Listbox.Button className={clsx('select-button', size, buttonClassName)} ref={setReferenceElement}>
                <span className="select-button-label">
                    {
                        selectedOption === undefined
                            ? ''
                            : getSelectedOptionDisplay(selectedOption)
                    }
                </span>
                <span className="select-button-icon">
                    <ChevronUpDownIcon aria-hidden="true" />
                </span>
            </Listbox.Button>
            {
                (error && !hideLabel) && (
                    <span className="field-error">
                        {error}
                    </span>
                )
            }
            <Listbox.Options className="select-options nowheel"
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}>
                {options.map((option) => {
                    const value = toValue(option)
                    return (
                        <Listbox.Option
                            key={getValueKey(value)}
                            value={value}
                            className={({ active, selected }) => clsx(
                                'select-option',
                                active && 'active',
                                selected && 'selected',
                            )}
                        >
                            <span>{getOptionDisplay(option)}</span>
                            <span className="option-icon">
                                <CheckIcon aria-hidden="true" />
                            </span>
                        </Listbox.Option>
                    )
                })}
                {optionsFooter}
            </Listbox.Options>
        </Listbox>
    )
}

SingleSelect.Field = function SingleSelectField<T, O, X extends FieldValues, P extends FieldPath<X>>({
    form,
    name,
    required,
    ...rest
}: FieldBindingsProps<SingleSelectProps<T, O>, T, X, P>) {

    const { field: { ref, ...field }, fieldState } = useController({
        control: form.control,
        name,
        rules: {
            required,
        },
    })

    return (
        <SingleSelect
            {...rest}
            {...field}
            required={required}
            error={fieldState.error?.message}
        />
    )
}
