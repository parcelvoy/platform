import { RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from './ui/PreferencesContext'
import { router } from './views/router'

export default function App() {
    return (
        <PreferencesProvider>
            <RouterProvider router={router} />
        </PreferencesProvider>
    )
}
