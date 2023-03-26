import clsx from 'clsx'
import { useId, Ref, ReactNode } from 'react'
import { FieldPath, FieldValues } from 'react-hook-form'
import { snakeToTitle } from '../../utils'
import { FieldProps } from './Field'
import './TextField.css'

export interface TextFieldProps<X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P> {
    type?: 'text' | 'time' | 'date' | 'datetime-local' | 'number' | 'password'
    textarea?: boolean
    size?: 'small' | 'regular'
    value?: string | number | readonly string[] | undefined
    placeholder?: string
    onChange?: (value: string) => void
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>
    onFocus?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>
    inputRef?: Ref<HTMLLabelElement>
    min?: number
    max?: number
    icon?: ReactNode
}

export default function TextField<X extends FieldValues, P extends FieldPath<X>>({
    type = 'text',
    disabled,
    form,
    label,
    subtitle,
    min,
    max,
    name,
    required,
    textarea,
    size = 'regular',
    value,
    onChange,
    onBlur: onInputBlur,
    onFocus,
    placeholder,
    inputRef,
    icon,
}: TextFieldProps<X, P>) {
    const id = useId()
    const formParams = form?.register(name, { disabled, required })
    const onBlur = formParams?.onBlur

    return (
        <label ref={inputRef} className={clsx('ui-text-field', { 'hide-label': !form && !label })}>
            {
                (!!form || !!label) && (
                    <span>
                        {label ?? snakeToTitle(name)}
                        {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                    </span>
                )
            }
            {subtitle && <span className="label-subtitle">{subtitle}</span>}
            <div className={clsx(icon && 'ui-text-field-icon-wrapper')}>
                {
                    textarea
                        ? (
                            <textarea
                                value={value}
                                {...formParams}
                                onChange={(event) => onChange?.(event?.target.value)}
                                onBlur={async (event) => {
                                    await onBlur?.(event)
                                    onInputBlur?.(event)
                                }}
                                onFocus={onFocus}
                                id={id}
                            />
                        )
                        : (
                            <input
                                type={type}
                                value={value}
                                className={size}
                                placeholder={placeholder}
                                {...formParams}
                                onChange={(event) => onChange?.(event?.target.value)}
                                onBlur={async (event) => {
                                    await onBlur?.(event)
                                    onInputBlur?.(event)
                                }}
                                onFocus={onFocus}
                                id={id}
                                min={min}
                                max={max}
                                disabled={disabled}
                            />
                        )
                }
                {
                    icon && (
                        <span className="ui-text-field-icon">
                            {icon}
                        </span>
                    )
                }
            </div>
        </label>
    )
}
