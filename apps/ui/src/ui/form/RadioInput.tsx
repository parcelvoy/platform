import { useEffect, useId } from 'react'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { RadioGroup } from '@headlessui/react'
import { ControlledInputProps, FieldBindingsProps, OptionsProps } from '../../types'
import './RadioInput.css'
import clsx from 'clsx'
import { defaultGetOptionDisplay, defaultGetValueKey } from '../utils'

interface RadioInputProps<T, O = T> extends ControlledInputProps<T>, OptionsProps<O, T> {}

export default function RadioInput<X, P = X>({
    disabled,
    label,
    subtitle,
    required,
    options,
    value,
    onChange,
    toValue = (option: any) => option.key,
    getValueKey = defaultGetValueKey,
}: RadioInputProps<X, P>) {
    const id = useId()
    useEffect(() => {
        if (!value && options[0]) {
            setTimeout(() => {
                onChange?.(toValue(options[0]))
            }, 0)
        }
    }, [options])

    return (
        <RadioGroup
            onChange={onChange}
            value={value}
            disabled={disabled}
            id={id}
            className="options-group"
        >
            <RadioGroup.Label>
                <span>
                    {label}
                    {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                </span>
            </RadioGroup.Label>
            {subtitle && <span className="label-subtitle">{subtitle}</span>}
            <div className="options">
                {options.map((option) => {
                    const value = toValue(option)
                    const label = defaultGetOptionDisplay(option)
                    return (
                        <RadioGroup.Option
                            key={getValueKey(value)}
                            value={value}
                            className={({ active, checked, disabled }) => clsx(
                                'option', { selected: checked, active, disabled },
                            )}>{label}</RadioGroup.Option>
                    )
                })}
            </div>
        </RadioGroup>
    )
}

RadioInput.Field = function RadioInputField<X extends FieldValues, P extends FieldPath<X>>({
    form,
    name,
    required,
    ...rest
}: FieldBindingsProps<RadioInputProps<any>, any, X, P>) {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { field: { ref, ...field }, fieldState } = useController({
        control: form.control,
        name,
        rules: {
            required,
        },
    })

    return (
        <RadioInput
            {...rest}
            {...field}
            required={required}
            error={fieldState.error?.message}
        />
    )
}
