import './JsonPreview.css'
import { JsonViewer } from '@textea/json-viewer'
import { useContext } from 'react'
import { PreferencesContext } from './PreferencesContext'

interface JsonPreviewParams {
    value: Record<string | number, any>
}

export default function JsonPreview({ value }: JsonPreviewParams) {
    const [preferences] = useContext(PreferencesContext)
    return (
        <JsonViewer
            value={value}
            rootName={false}
            theme={preferences.mode}
        />
    )
}
