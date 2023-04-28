import { useContext, useState } from 'react'
import { Image, Template } from '../../../types'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import SourceEditor from '@monaco-editor/react'
import { editor as Editor } from 'monaco-editor'
import { toast } from 'react-hot-toast'
import Button from '../../../ui/Button'
import ImageGalleryModal from '../ImageGalleryModal'
import { formatDate } from '../../../utils'
import Preview from '../../../ui/Preview'
import Tabs from '../../../ui/Tabs'
import { ImageIcon } from '../../../ui/icons'

export default function HtmlEditor({ template, setTemplate }: { template: Template, setTemplate: (template: Template) => void }) {

    const [monaco, setMonaco] = useState<Editor.IStandaloneCodeEditor | undefined>()

    const [preferences] = useContext(PreferencesContext)
    const [data, setData] = useState(template.data)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [showImages, setShowImages] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    function handleMount(editor: Editor.IStandaloneCodeEditor) {
        setMonaco(editor)
    }

    function handleHtmlChange(html?: string) {
        setData({ ...data, html })
    }

    function handleTextChange(text?: string) {
        setData({ ...data, text })
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

    async function handleSave() {
        try {
            setIsSaving(true)
            template.data = data
            await setTemplate(template)
            toast.success('Saved!')
        } catch (error) {
            toast.error('Unable to save template.')
        } finally {
            setIsSaving(false)
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
                                    defaultValue={data.html}
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
                                defaultValue={data.text}
                                onChange={handleTextChange}
                                options={{ wordWrap: 'on' }}
                                theme="vs-dark"
                            />,
                        }]}
                    />
                </div>
                <div className="source-preview">
                    <Preview template={{ type: 'email', data }} />
                </div>
            </section>
            <div className="email-editor-footer">
                <div className="publish-details">
                    <span className="publish-label">Last updated at</span>
                    <span className="publish-date">{formatDate(preferences, template.updated_at)}</span>
                </div>
                <Button onClick={async () => await handleSave()} isLoading={isSaving}>Save</Button>
            </div>

            <ImageGalleryModal
                open={showImages}
                onClose={setShowImages}
                onInsert={handleImageInsert} />
        </>
    )
}
