import 'grapesjs/dist/css/grapes.min.css'
import './VisualEditor.css'
import grapesJS, { Editor } from 'grapesjs'
import grapesJSMJML from 'grapesjs-mjml'
import { useEffect, useState } from 'react'
import { Font, Resource, Template } from '../../../types'
import ImageGalleryModal, { ImageUpload } from './ImageGalleryModal'

interface GrapesAssetManagerProps {
    event: 'open' | 'close'
    open: boolean
    select: (asset: any) => void
    close: () => void
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
    const [loaded, setLoaded] = useState(false)

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
        const options = fontProperty?.getOptions()
        const newOptions = [
            ...options.filter((option: any) => !option.custom),
            ...fonts.map(font => ({
                id: font.value,
                label: font.name,
                custom: true,
            })),
        ]
        fontProperty?.setOptions(newOptions)
        styleManager.render()

        updateHead(editor, fonts)
    }

    const registerSourcePlugin = (editor: Editor) => {
        editor.Commands.add('edit-raw-source', {
            run(editor) {
                const escapeHtml = (str: string): string => {
                    const div = document.createElement('div')
                    div.textContent = str
                    return div.innerHTML
                }

                const modal = editor.Modal
                const html = editor.getHtml()
                const css = editor.getCss()

                const container = document.createElement('div')
                container.style.padding = '8px'
                container.innerHTML = `
                    <div style="margin-bottom: 6px">HTML</div>
                    <textarea id="raw-html" style="width:100%;height:220px">${escapeHtml(html)}</textarea>
                    <div style="margin: 10px 0 6px">CSS</div>
                    <textarea id="raw-css" style="width:100%;height:140px">${css}</textarea>
                    <button id="apply-code" class="gjs-btn gjs-btn-prim" style="margin-top:10px">Apply</button>
                `
                modal.open({ title: 'Edit Source', content: container })

                const htmlEl = container.querySelector<HTMLTextAreaElement>('#raw-html')
                const cssEl = container.querySelector<HTMLTextAreaElement>('#raw-css')
                const applyBtn = container.querySelector<HTMLButtonElement>('#apply-code')

                applyBtn?.addEventListener('click', () => {
                    const newHtml = htmlEl?.value ?? ''
                    const newCss = cssEl?.value ?? ''
                    editor.setComponents(newHtml)
                    editor.setStyle(newCss)
                    modal.close()
                })
            },
        })

        editor.Panels.addButton('options', {
            id: 'edit-raw-source',
            label: '<i class="fa fa-code"></i>',
            command: 'edit-raw-source',
            togglable: false,
        })

        editor.Panels.getButton('options', 'export-template')?.set({
            className: 'fa fa-solid fa-html5',
            attributes: { title: 'View MJML & HTML' }, // Optional tooltip
        })
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
                registerSourcePlugin(editor)
                setLoaded(true)
            })
            editor.render()
            editor.setComponents(mjml ?? '<mjml><mj-body></mj-body></mjml>')
            editor.on('update', () => {
                onChange(editor.getHtml(), editor.runCommand('mjml-code-to-html').html, editor)
            })
        }
    }, [])

    useEffect(() => {
        if (editor) updateFontUi(editor, fonts)
    }, [loaded, fonts])

    return <div id={id} />
}

interface VisualEditorProps {
    template: Template
    setTemplate: (template: Template) => void
    resources: Resource[]
}

export default function VisualEditor({ template, setTemplate, resources }: VisualEditorProps) {
    const [showImages, setShowImages] = useState(false)
    const [assetManager, setAssetManager] = useState<GrapesAssetManagerProps | undefined>()
    const fonts = resources.map(resource => resource.value as Font)
    function handleSetTemplate(mjml: string, html: string) {
        setTemplate({ ...template, data: { ...template.data, mjml, html } })
    }

    function handleImageInsert(image: ImageUpload) {
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
