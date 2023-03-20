import { isRouteErrorResponse, Navigate, useNavigate, useRouteError } from 'react-router-dom'
import Alert from '../ui/Alert'
import Button from '../ui/Button'

export default function ErrorPage() {
    const error = useRouteError() as any
    const navigate = useNavigate()

    console.error(error)

    let status = 500
    let message = ''
    if (isRouteErrorResponse(error)) {
        status = error.status
        message = error.data + ''
    }
    if (error.response) {
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
            <Alert
                variant="info"
                title="Page Not Found"
                style={{ margin: 15 }}
                actions={
                    <Button
                        onClick={() => navigate(-1)}
                    >
                        Go Back
                    </Button>
                }
            />
        )
    }

    return (
        <Alert variant="error" title={`Error [${status.toString()}]`}>
            {message}
        </Alert>
    )
}

export function AccessDenied() {
    return (
        <Alert variant="warn" title="Access Denied" style={{ margin: 15 }}>
            Additional permission is required in order to access this section.
            Please reach out to your administrator.
        </Alert>
    )
}
