import 'grapesjs/dist/css/grapes.min.css'
import './VisualEditor.css'
import grapesJS, { Editor } from 'grapesjs'
import grapesJSMJML from 'grapesjs-mjml'
import { useEffect, useState } from 'react'
import { Image, Template } from '../../../types'
import ImageGalleryModal from '../ImageGalleryModal'

interface GrapesAssetManagerProps {
    event: 'open' | 'close'
    open: boolean
    select: (asset: any) => void
    close: () => void
}

interface GrapesReactProps {
    id: HTMLElement['id']
    value?: string
    onChange: (value: string, editor: Editor) => void
    setAssetState: (props: GrapesAssetManagerProps) => void
}

export function GrapesReact({ id, value, onChange, setAssetState }: GrapesReactProps) {
    const [editor, setEditor] = useState<Editor | undefined>(undefined)
    useEffect(() => {
        if (!editor) {
            const editor = grapesJS.init({
                fromElement: false,
                container: `#${id}`,
                storageManager: false,
                plugins: [grapesJSMJML],
                pluginsOpts: {
                    [grapesJSMJML]: {/* ...options */},
                },
                height: '100%',
                assetManager: {
                    custom: {
                        open(props) {
                            setAssetState({ ...props, event: 'open' })
                        },
                        close(props) {
                            setAssetState({ ...props, event: 'close' })
                        },
                    },
                },
            })
            setEditor(editor)
            editor.setComponents(value ?? '<mjml><mj-body></mj-body></mjml>')
            editor?.on('update', () => {
                onChange(editor.getHtml(), editor)
            })
        }
    }, [])

    return <div id={id} />
}

export default function VisualEditor({ template, setTemplate }: { template: Template, setTemplate: (template: Template) => void }) {
    const [showImages, setShowImages] = useState(false)
    const [assetManager, setAssetManager] = useState<GrapesAssetManagerProps | undefined>()

    function handleSetTemplate(mjml: string) {
        setTemplate({ ...template, data: { ...template.data, mjml, html: mjml } })
    }

    function handleImageInsert(image: Image) {
        assetManager?.select({ src: image.url })
        handleHideImages()
    }

    function handleHideImages() {
        setShowImages(false)
        assetManager?.close()
    }

    function handleAssetState(state: GrapesAssetManagerProps) {
        setShowImages(state.event === 'open')
        setAssetManager(state)
    }

    return (
        <>
            <GrapesReact
                id={`grapes-editor-${template.id}`}
                value={template.data.mjml}
                onChange={handleSetTemplate}
                setAssetState={handleAssetState} />
            <ImageGalleryModal
                open={showImages}
                onClose={handleHideImages}
                onInsert={handleImageInsert} />
        </>
    )
}
