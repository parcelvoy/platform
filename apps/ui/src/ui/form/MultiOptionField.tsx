import clsx from 'clsx'
import { ControlledInputProps } from '../../types'
import { FieldOption } from './Field'

interface MultiOptionFieldProps extends ControlledInputProps<any[]> {
    options: FieldOption[]
}

export function MultiOptionField({
    disabled,
    label,
    onChange,
    options,
    subtitle,
    required,
    value,
}: MultiOptionFieldProps) {

    return (
        <div className="options-group">
            {
                label && (
                    <label role="none">
                        <span>
                            {label}
                            {required && <span style={{ color: 'red' }}>&nbsp;*</span>}
                        </span>
                    </label>
                )
            }
            {subtitle && <span className="label-subtitle">{subtitle}</span>}
            <div className="options">
                {
                    options.map(({ key, label }) => {

                        const selected = !!value?.includes(key)

                        return (
                            <label
                                key={key}
                                className={clsx('option', selected && 'selected')}
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(value?.includes(key))}
                                    onChange={e => onChange(e.target.checked
                                        ? (value?.includes(key) ? value : [...value ?? [], key])
                                        : value?.filter(v => v !== key) ?? [],
                                    )}
                                    style={{ display: 'none' }}
                                    disabled={disabled}
                                />
                                {label}
                            </label>
                        )
                    })
                }
            </div>
        </div>
    )
}
