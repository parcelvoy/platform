import { JsonViewer } from '@textea/json-viewer'

interface JsonPreviewParams {
    value: Record<string | number, any>
}

export default function JsonPreview({ value }: JsonPreviewParams) {
    return <JsonViewer
        value={value}
        rootName={false}
    />
}
