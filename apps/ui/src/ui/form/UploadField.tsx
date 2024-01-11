import React, { useId, useState } from 'react'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { FieldProps } from './Field'
import './UploadField.css'

interface UploadFieldProps<X extends FieldValues, P extends FieldPath<X>> extends FieldProps<X, P> {
    value?: FileList | null
    onChange?: (value: FileList) => void
    isUploading?: boolean
    accept?: string
}

export default function UploadField<X extends FieldValues, P extends FieldPath<X>>(props: UploadFieldProps<X, P>) {
    const id = useId()
    const {
        disabled,
        form,
        label,
        name,
        required,
        isUploading = false,
        accept = 'text/csv',
    } = props
    let { value, onChange } = props
    if (form) {
        const { field } = useController({ name, control: form?.control })
        value = field.value
        onChange = field.onChange
    }

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
        onChange?.(event.dataTransfer.files)
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
                ? isUploading
                    ? `Uploading ${value?.[0].name} ...`
                    : value?.[0].name
                : 'Click to select file or drop one in.' }</p>
            <input
                type="file"
                id={id}
                name={name}
                accept={accept}
                required={required}
                disabled={disabled ?? isUploading}
                onChange={(event) => event.target.files && onChange?.(event.target.files)} />
        </label>
    )
}
