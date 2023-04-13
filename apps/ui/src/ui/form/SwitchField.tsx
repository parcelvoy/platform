import { useId } from 'react'
import { FieldPath, FieldValues } from 'react-hook-form'
import { FieldProps } from './Field'

interface SwitchFieldProps<X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P> {
    checked?: boolean
    onChange?: (checked: boolean) => void
}

export default function SwitchField<X extends FieldValues, P extends FieldPath<X>>({
    disabled,
    form,
    label,
    subtitle,
    name,
    required,
    checked,
    onChange,
}: SwitchFieldProps<X, P>) {
    const id = useId()
    return (
        <label>
            { label && <span>
                {label ?? name}
                {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
            </span>
            }
            {subtitle && <span className="label-subtitle">{subtitle}</span>}
            <div className="switch">
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={(event) => onChange?.(event.target.checked)}
                    {...form?.register(name, { disabled })}
                />
                <div className="slider round"></div>
            </div>
        </label>
    )
}
