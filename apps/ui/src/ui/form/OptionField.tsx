import { useEffect, useId } from 'react'
import { FieldPath, FieldValues, PathValue, useController } from 'react-hook-form'
import { RadioGroup } from '@headlessui/react'
import { FieldProps, FieldOption } from './Field'
import './OptionField.css'
import { snakeToTitle } from '../../utils'
import clsx from 'clsx'

interface OptionFieldProps<X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P> {
    options: FieldOption[]
    value?: PathValue<X, P>
    onChange?: (value: PathValue<X, P>) => void
}

export default function OptionField<X extends FieldValues, P extends FieldPath<X>>(props: OptionFieldProps<X, P>) {
    const id = useId()
    const {
        disabled,
        form,
        label,
        subtitle,
        name,
        required,
        options,
    } = props
    let { value, onChange } = props
    if (form) {
        const { field } = useController({ name, control: form?.control })
        value = field.value
        onChange = field.onChange
    }
    useEffect(() => {
        if (!value && options[0]) onChange?.(options[0].key as any)
    }, [options])

    return (
        <RadioGroup {...form?.register(name, { disabled, required })}
            onChange={onChange}
            value={value}
            id={id}
            className="options-group"
        >
            <RadioGroup.Label>
                <span>
                    {label ?? snakeToTitle(name)}
                    {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                </span>
            </RadioGroup.Label>
            {subtitle && <span className="label-subtitle">{subtitle}</span>}
            <div className="options">
                {options.map(({ key, label }) => (
                    <RadioGroup.Option
                        key={key}
                        value={key}
                        className={({ active, checked, disabled }) => clsx(
                            'option', { selected: checked, active, disabled },
                        )}>{label}</RadioGroup.Option>
                ))}
            </div>
        </RadioGroup>
    )
}
