import { ReactNode, useState } from 'react'
import { DeepPartial, DeepRequired, FieldErrorsImpl, FieldValues, useForm, UseFormReturn } from 'react-hook-form'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import Alert from '../Alert'
import Button from '../Button'

interface FormWrapperProps<T extends FieldValues> {
    children: (form: UseFormReturn<T>) => ReactNode
    defaultValues?: DeepPartial<T>
    submitLabel?: string
    onSubmit: (data: T, navigate: NavigateFunction) => Promise<void>
}

export default function FormWrapper<T extends FieldValues>({
    children,
    defaultValues,
    submitLabel = 'Submit',
    onSubmit,
}: FormWrapperProps<T>) {

    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<T>({
        defaultValues,
    })

    const handleSubmit = form.handleSubmit(async data => {
        setIsLoading(true)
        onSubmit(data, navigate).finally(() => {
            setIsLoading(false)
        })
    })

    const handleErrors = (errors: Partial<FieldErrorsImpl<DeepRequired<T>>>) => {
        const keys = Object.keys(errors)
        if (keys.length) {
            const key = keys[0]
            const error = errors[key]
            if (error?.type === 'required') {
                return `The ${key} field is required`
            } else {
                return `Unable to submit the form: ${JSON.stringify(error)}`
            }
        }
    }

    const { errors } = form.formState
    const error = handleErrors(errors)

    return (
        <form onSubmit={handleSubmit} noValidate>
            <>
                {error && <Alert variant="error" title="Error">{error}</Alert>}
                {children(form)}
                <label className="form-submit">
                    <Button type="submit" isLoading={isLoading}>
                        {submitLabel}
                    </Button>
                </label>
            </>
        </form>
    )
}
