import { HTML5Backend } from 'react-dnd-html5-backend'
import { Toaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import { PreferencesProvider } from './ui/PreferencesContext'
import { router } from './views/router'
import { DndProvider } from 'react-dnd'

export default function App() {
    return (
        <PreferencesProvider>
            <DndProvider backend={HTML5Backend}>
                <RouterProvider router={router} />
                <Toaster />
            </DndProvider>
        </PreferencesProvider>
    )
}
