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

    const handleErrors = (errors: Partial<FieldErrorsImpl<DeepRequired<T>>>): string | undefined => {
        const keys = Object.keys(errors)
        if (keys.length === 0) return undefined

        const key = keys[0]
        const error = errors[key]
        if (error) {

            // If nested, keep searching
            if (!error.type) {
                return handleErrors(error)
            } else if (error.type === 'required') {
                return `The \`${key}\` field is required`
            } else if (error.message && typeof error.message === 'string') {
                return error.message
            }
        }
        return 'Unable to submit the form an unknown error has occurred'
    }

    const { errors, isDirty, isValid } = form.formState
    const error = handleErrors(errors)

    return (
        <form onSubmit={handleSubmit} noValidate>
            <>
                {error && <Alert variant="error" title="Error">{error}</Alert>}
                {children(form)}
                <label className="form-submit">
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={!isDirty || !isValid}>
                        {submitLabel}
                    </Button>
                </label>
            </>
        </form>
    )
}
