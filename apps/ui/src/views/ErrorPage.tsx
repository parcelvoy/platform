import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export default function ErrorPage() {
    const error = useRouteError() as any

    console.error(error)

    if (isRouteErrorResponse(error)) {

        if (error.status === 401) {

            return null
        }

        return (
            <div>
                {error.statusText || error.statusText}
            </div>
        )
    }

    return (
        <div>
            {'an error has occurred!'}
        </div>
    )
}
