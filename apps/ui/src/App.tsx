import { useMemo } from 'react'
import { Toaster } from 'react-hot-toast'
import { RouteObject, RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from './ui/PreferencesContext'
import { createRouter } from './views/router'

interface AppProps {
    additionalRoutes?: RouteObject[] // be sure to memoize this
}

export default function App({ additionalRoutes }: AppProps) {

    const router = useMemo(() => createRouter(additionalRoutes), [additionalRoutes])

    return (
        <PreferencesProvider>
            <RouterProvider router={router} />
            <Toaster />
        </PreferencesProvider>
    )
}
