import { useMemo } from 'react'
import { RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from './ui/PreferencesContext'
import { RouterProps, createRouter } from './views/router'
import { Toaster } from './ui/Toast'

export default function App(props: RouterProps) {

    const router = useMemo(() => createRouter(props), [props])

    return (
        <PreferencesProvider>
            <RouterProvider router={router} />
            <Toaster />
        </PreferencesProvider>
    )
}
