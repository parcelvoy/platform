import { ReactNode } from 'react'
import { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'

export interface FieldProps<X extends FieldValues, P extends FieldPath<X>> {
    form?: UseFormReturn<X>
    name: P
    label?: ReactNode
    subtitle?: ReactNode
    required?: boolean
    disabled?: boolean
}

export interface FieldOption {
    key: string | number
    label: string
}
