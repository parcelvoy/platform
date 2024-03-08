import { isRouteErrorResponse, Navigate, useNavigate, useRouteError } from 'react-router-dom'
import Alert, { AlertProps } from '../ui/Alert'
import Button from '../ui/Button'
import './ErrorPage.css'
import api from '../api'

const ErrorAlert = (props: AlertProps) => {
    return <section className="error-page">
        <Alert {...props} />
    </section>
}

export default function ErrorPage({ status = 500 }: { status?: number }) {
    const error = useRouteError() as any
    const navigate = useNavigate()

    console.error(error)

    let message = ''
    if (isRouteErrorResponse(error)) {
        status = error.status
        message = error.data + ''
    }
    if (error?.response) {
        status = error.response.status
        message = error.response.data + ''
    }

    if (status === 401) {
        // in case the data router didn't catch this already
        return (
            <Navigate to="/login" />
        )
    }

    if (status === 403) {
        return (
            <AccessDenied />
        )
    }

    if (status === 404) {
        return (
            <ErrorAlert
                variant="plain"
                title="Looks Like You're Lost!"
                actions={
                    <Button onClick={() => navigate('/')}>
                        Go Back
                    </Button>
                }
            >The page or resource you are looking for does not exist or has been moved.</ErrorAlert>
        )
    }

    return (
        <ErrorAlert variant="error" title={`Error [${status.toString()}]`}>
            {message}
        </ErrorAlert>
    )
}

export function AccessDenied() {
    const handleLogout = async () => {
        await api.auth.logout()
    }

    return (
        <ErrorAlert
            variant="warn"
            title="Access Denied"
            actions={
                <Button onClick={handleLogout}>Logout</Button>
            }
        >
            Additional permission is required in order to access this section.
            Please reach out to your administrator.
        </ErrorAlert>
    )
}
