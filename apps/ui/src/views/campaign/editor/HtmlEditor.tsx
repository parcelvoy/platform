import { useState } from 'react'
import { Image, Template } from '../../../types'
import SourceEditor, { Monaco } from '@monaco-editor/react'
import { editor as Editor } from 'monaco-editor'
import Button from '../../../ui/Button'
import ImageGalleryModal from '../ImageGalleryModal'
import Preview from '../../../ui/Preview'
import Tabs from '../../../ui/Tabs'
import { ImageIcon } from '../../../ui/icons'

export default function HtmlEditor({ template, setTemplate }: { template: Template, setTemplate: (template: Template) => void }) {

    const [monaco, setMonaco] = useState<Editor.IStandaloneCodeEditor | undefined>()

    const [selectedIndex, setSelectedIndex] = useState(0)
    const [showImages, setShowImages] = useState(false)

    function handleMount(editor: Editor.IStandaloneCodeEditor, instance: Monaco) {
        instance.editor.defineTheme('default', {
            base: 'vs-dark',
            inherit: true,
            rules: [{
                background: '#0d121e',
                token: '',
            }],
            colors: {
                'editor.background': '#0d121e',
            },
        })
        instance.editor.setTheme('default')
        if (!monaco) setMonaco(editor)
    }

    function handleHtmlChange(html?: string) {
        const newTemplate = { ...template }
        newTemplate.data.html = html
        setTemplate(newTemplate)
    }

    function handleTextChange(text?: string) {
        const newTemplate = { ...template }
        newTemplate.data.text = text
        setTemplate(template)
    }

    function handleImageInsert(image: Image) {
        setShowImages(false)
        handleEditorInsert(`<img src="${image.url}" alt="${image.alt || image.name}" />`)
    }

    function handleEditorInsert(text: string) {
        if (monaco) {
            const selection = monaco.getSelection()
            const id = { major: 1, minor: 1 }
            const op = {
                identifier: id,
                range: {
                    startLineNumber: selection?.selectionStartLineNumber ?? 1,
                    startColumn: selection?.selectionStartColumn ?? 1,
                    endLineNumber: selection?.endLineNumber ?? 1,
                    endColumn: selection?.endColumn ?? 1,
                },
                text,
                forceMoveMarkers: true,
            }
            monaco.executeEdits('html', [op])
        }
    }

    return (
        <>
            <section className="editor-html">
                <div className="source-editor">
                    <Tabs
                        selectedIndex={selectedIndex}
                        onChange={setSelectedIndex}
                        tabs={[{
                            key: 'html',
                            label: 'HTML',
                            children: <>
                                <SourceEditor
                                    height="100%"
                                    defaultLanguage="handlebars"
                                    defaultValue={template.data.html}
                                    onChange={handleHtmlChange}
                                    onMount={handleMount}
                                    options={{ wordWrap: 'on' }}
                                    theme="vs-dark"
                                />
                                <div className="editor-toolbar">
                                    <Button
                                        variant="secondary"
                                        icon={<ImageIcon />}
                                        onClick={() => setShowImages(true)}
                                    >Images</Button>
                                </div>
                            </>,
                        },
                        {
                            key: 'text',
                            label: 'Plain Text',
                            children: <SourceEditor
                                height="100%"
                                defaultLanguage="handlebars"
                                defaultValue={template.data.text}
                                onChange={handleTextChange}
                                onMount={handleMount}
                                options={{ wordWrap: 'on' }}
                                theme="vs-dark"
                            />,
                        }]}
                    />
                </div>
                <div className="source-preview">
                    <Preview template={{ type: 'email', data: template.data }} />
                </div>
            </section>

            <ImageGalleryModal
                open={showImages}
                onClose={setShowImages}
                onInsert={handleImageInsert} />
        </>
    )
}
