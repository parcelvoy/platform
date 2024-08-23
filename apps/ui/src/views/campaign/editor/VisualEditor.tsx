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

interface Font {
    name: string
    url: string
    value: string
}

interface GrapesReactProps {
    id: HTMLElement['id']
    mjml?: string
    onChange: (mjml: string, html: string, editor: Editor) => void
    setAssetState: (props: GrapesAssetManagerProps) => void
    fonts?: Font[]
}

function GrapesReact({ id, mjml, onChange, setAssetState, fonts = [] }: GrapesReactProps) {
    const [editor, setEditor] = useState<Editor | undefined>(undefined)

    const removeAll = (doc: Document, attr: string) => {
        const all = doc.head.querySelectorAll(`[${attr}]`)
        Array.from(all)
            .forEach((el) => el.remove())
    }

    const getFontHtml = (url: string) => {
        return `
            <link href="${url}" rel="stylesheet" type="text/css" data-silex-font>
            <style type="text/css" data-silex-font>
                @import url(${url});
            </style>
        `
    }

    const GOOGLE_FONTS_ATTR = 'data-silex-gstatic'
    const updateHead = (editor: Editor, fonts: Font[]) => {
        const doc = editor.Canvas.getDocument()
        if (!doc) return
        removeAll(doc, GOOGLE_FONTS_ATTR)
        let html = ''
        for (const font of fonts) {
            html += getFontHtml(font.url)
        }
        doc.head.insertAdjacentHTML('beforeend', html)
    }

    const updateFontUi = (editor: Editor, fonts: Font[]) => {
        const styleManager = editor.StyleManager
        const fontProperty = styleManager.getProperty('typography', 'font-family') as any
        const list = []
        for (const { value, name } of fonts) {
            list.push(fontProperty.addOption({ value, name }))
        }
        fontProperty?.set('list' as any, list)
        styleManager.render()

        updateHead(editor, fonts)
    }

    useEffect(() => {
        if (!editor) {
            const editor = grapesJS.init({
                fromElement: false,
                container: `#${id}`,
                storageManager: false,
                autorender: false,
                plugins: [grapesJSMJML],
                pluginsOpts: {
                    [grapesJSMJML as any]: {
                        fonts: fonts.reduce((acc, { name, url }) => ({ ...acc, [name]: url }), {}),
                    },
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
            editor.on('load', () => {
                editor.Panels.getButton('views', 'open-blocks')
                    ?.set('active', true)
                updateFontUi(editor, fonts)
            })
            editor.render()
            editor.setComponents(mjml ?? '<mjml><mj-body></mj-body></mjml>')
            editor.on('update', () => {
                onChange(editor.getHtml(), editor.runCommand('mjml-code-to-html').html, editor)
            })
        }
    }, [])

    return <div id={id} />
}

export default function VisualEditor({ template, setTemplate }: { template: Template, setTemplate: (template: Template) => void }) {
    const [showImages, setShowImages] = useState(false)
    const [assetManager, setAssetManager] = useState<GrapesAssetManagerProps | undefined>()
    const fonts = [{
        name: 'Montserrat',
        url: 'https://fonts.googleapis.com/css?family=Montserrat',
        value: 'Montserrat',
    }, {
        name: 'Open Sans',
        url: 'https://fonts.googleapis.com/css?family=Open+Sans',
        value: 'Open Sans',
    }]

    function handleSetTemplate(mjml: string, html: string) {
        setTemplate({ ...template, data: { ...template.data, mjml, html } })
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
                mjml={template.data.mjml}
                fonts={fonts}
                onChange={handleSetTemplate}
                setAssetState={handleAssetState} />
            <ImageGalleryModal
                open={showImages}
                onClose={handleHideImages}
                onInsert={handleImageInsert} />
        </>
    )
}
