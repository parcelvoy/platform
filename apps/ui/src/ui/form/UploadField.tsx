import React, { useId, useState } from 'react'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { FieldProps } from './Field'
import './UploadField.css'

interface UploadFieldProps<X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P> {
}

export default function UploadField<X extends FieldValues, P extends FieldPath<X>>(props: UploadFieldProps<X, P>) {
    const id = useId()
    const {
        disabled,
        form,
        label,
        name,
        required,
    } = props
    const { field: { value, onChange } } = useController({ name, control: form?.control })

    const [isHighlighted, setIsHighlighted] = useState(false)

    const dragEnter = (event: React.DragEvent<HTMLLabelElement>) => {
        setIsHighlighted(true)
        event.preventDefault()
        event.stopPropagation()
    }

    const dragExit = (event: React.DragEvent<HTMLLabelElement>) => {
        setIsHighlighted(false)
        event.preventDefault()
        event.stopPropagation()
    }

    const drop = (event: React.DragEvent<HTMLLabelElement>) => {
        dragExit(event)
        onChange(event.dataTransfer.files)
    }

    return (
        <label className={`ui-upload-field ${isHighlighted ? 'highlighted' : ''}`}
            onDragEnter={dragEnter}
            onDragOver={dragEnter}
            onDragLeave={dragExit}
            onDrop={drop}>
            <span>
                {label ?? name}
                {required && <span style={{ color: 'red' }}>*</span>}
            </span>

            <p>{value?.[0]
                ? value?.[0].name
                : 'Click to select file or drop one in.' }</p>
            <input
                type="file"
                id={id}
                name={name}
                accept="text/csv"
                required={required}
                disabled={disabled}
                onChange={(event) => onChange(event.target.files)} />
        </label>
    )
}
