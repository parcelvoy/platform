import { ReactNode, useState } from 'react'
import { DeepRequired, DefaultValues, FieldErrorsImpl, FieldValues, useForm, UseFormReturn } from 'react-hook-form'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import Alert from '../Alert'
import Button from '../Button'
import { useTranslation } from 'react-i18next'

interface FormWrapperProps<T extends FieldValues> {
    children: (form: UseFormReturn<T>) => ReactNode
    defaultValues?: DefaultValues<T>
    disabled?: boolean
    submitLabel?: string
    onSubmit: (data: T, navigate: NavigateFunction) => Promise<void>
    onError?: (error: Error) => void
}

export default function FormWrapper<T extends FieldValues>({
    children,
    defaultValues,
    disabled,
    submitLabel,
    onSubmit,
    onError,
}: FormWrapperProps<T>) {

    const { t } = useTranslation()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [submitError, setSubmitError] = useState<Error | any | undefined>()
    submitLabel = submitLabel ?? t('submit')

    const form = useForm<T>({
        defaultValues,
        disabled,
    })

    const handleSubmit = form.handleSubmit(async data => {
        setIsLoading(true)
        try {
            await onSubmit(data, navigate)
        } catch (error: any) {
            setSubmitError(error)
            onError?.(error)
        } finally {
            setIsLoading(false)
        }
    })

    const defaultError = 'Unable to submit the form an unknown error has occurred'
    const handleFormErrors = (errors: Partial<FieldErrorsImpl<DeepRequired<T>>>): string | undefined => {
        const keys = Object.keys(errors)
        if (keys.length === 0) return undefined

        const key = keys[0]
        const error = errors[key]
        if (error) {

            // If nested, keep searching
            if (!error.type) {
                return handleFormErrors(error)
            } else if (error.type === 'required') {
                return `The \`${key}\` field is required`
            } else if (error.type === 'minLength') {
                return `The \`${key}\` field has not met the minimum length`
            } else if (error.message && typeof error.message === 'string') {
                return error.message
            }
        }
        return defaultError
    }

    const handleServerErrors = (): string | undefined => {
        if (!submitError) return undefined
        if (submitError.error) {
            return submitError.error
        } else if (submitError.response?.data?.error) {
            return submitError.response?.data?.error
        } else if (submitError.message) {
            return submitError.message
        }
        return defaultError
    }

    const { errors, isValid } = form.formState
    const error = handleFormErrors(errors) ?? handleServerErrors()

    return (
        <form onSubmit={handleSubmit} noValidate>
            <>
                {error && <Alert variant="error" title="Error">{error}</Alert>}
                {children(form)}
                <label className="form-submit">
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={!isValid || disabled}>
                        {submitLabel}
                    </Button>
                </label>
            </>
        </form>
    )
}
