import clsx from 'clsx'
import { Ref, ReactNode } from 'react'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { ControlledInputProps, FieldProps } from '../../types'
import { snakeToTitle } from '../../utils'
import './TextInput.css'

type TextInputValue = string | number | readonly string[] | undefined
export interface BaseTextInputProps<T extends TextInputValue> extends Partial<ControlledInputProps<T>> {
    type?: 'text' | 'time' | 'date' | 'datetime-local' | 'number' | 'password'
    textarea?: boolean
    size?: 'small' | 'regular'
    value?: T
    name: string
    placeholder?: string
    onChange?: (value: T) => void
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>
    onFocus?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>
    labelRef?: Ref<HTMLLabelElement>
    inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
    hideLabel?: boolean
    min?: number
    max?: number
    icon?: ReactNode
}

export type TextInputProps<T extends TextInputValue> = BaseTextInputProps<T> & (
    | {
        textarea: true
        inputRef?: Ref<HTMLTextAreaElement>
    } | {
        textarea: false
        inputRef?: Ref<HTMLInputElement>
    } | {
        textarea?: undefined
        inputRef?: Ref<HTMLInputElement>
    }
)

export default function TextInput<X extends TextInputValue>({
    type = 'text',
    disabled,
    label,
    subtitle,
    min,
    max,
    name,
    required,
    textarea,
    size = 'regular',
    value = '',
    onChange,
    onBlur,
    onFocus,
    placeholder,
    labelRef,
    inputRef,
    hideLabel = false,
    icon,
}: TextInputProps<X>) {
    return (
        <label ref={labelRef} className={clsx('ui-text-input', { 'hide-label': hideLabel })}>
            {
                !hideLabel && (
                    <span>
                        {label ?? snakeToTitle(name)}
                        {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                    </span>
                )
            }
            {subtitle && <span className="label-subtitle">{subtitle}</span>}
            <div className={clsx(icon && 'ui-text-input-icon-wrapper')}>
                {
                    textarea
                        ? (
                            <textarea
                                value={value}
                                onChange={(event) => onChange?.(event?.target.value as X)}
                                onBlur={onBlur}
                                onFocus={onFocus}
                                ref={inputRef}
                                disabled={disabled}
                            />
                        )
                        : (
                            <input
                                type={type}
                                value={value}
                                className={size}
                                placeholder={placeholder}
                                onChange={(event) => {
                                    const inputValue = typeof value === 'number' || type === 'number'
                                        ? event?.target.valueAsNumber
                                        : event?.target.value
                                    onChange?.(inputValue as X)
                                }}
                                onBlur={onBlur}
                                onFocus={onFocus}
                                ref={inputRef}
                                min={min}
                                max={max}
                                disabled={disabled}
                            />
                        )
                }
                {
                    icon && (
                        <span className="ui-text-input-icon">
                            {icon}
                        </span>
                    )
                }
            </div>
        </label>
    )
}

TextInput.Field = function TextInputField<X extends FieldValues, P extends FieldPath<X>>({
    form,
    name,
    required,
    value,
    onChange,
    onBlur,
    ...rest
}: TextInputProps<P> & FieldProps<X, P>) {

    const { field: { ref, ...field }, fieldState } = useController({
        control: form.control,
        name,
        rules: {
            required,
        },
    })

    return (
        <TextInput
            {...rest}
            {...field}
            inputRef={ref}
            onBlur={async (event) => {
                await field.onBlur?.()
                onBlur?.(event)
            }}
            onChange={async (event) => {
                await field.onChange?.(event)
                onChange?.(event)
            }}
            required={required}
            error={fieldState.error?.message}
        />
    )
}
