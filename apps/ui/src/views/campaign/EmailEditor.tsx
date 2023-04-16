import { useContext, useState } from 'react'
import { CampaignContext, ProjectContext } from '../../contexts'
import SourceEditor from '@monaco-editor/react'
import { editor as Editor } from 'monaco-editor'
import './EmailEditor.css'
import Button from '../../ui/Button'
import api from '../../api'
import { Image, Template } from '../../types'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Preview from '../../ui/Preview'
import { locales } from './CampaignDetail'
import Tabs from '../../ui/Tabs'
import { formatDate } from '../../utils'
import { PreferencesContext } from '../../ui/PreferencesContext'
import CreateLocaleModal from './CreateLocaleModal'
import ImageGalleryModal from './ImageGalleryModal'
import Modal from '../../ui/Modal'
import { ImageIcon } from '../../ui/icons'
import EditLocalesModal from './EditLocalesModal'
import { toast } from 'react-hot-toast'

const HtmlEditor = ({ template, setTemplate }: { template: Template, setTemplate: (template: Template) => void }) => {

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

export default function EmailEditor() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [project] = useContext(ProjectContext)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const { templates } = campaign
    const allLocales = locales(templates)

    const [isAddLocaleOpen, setIsAddLocaleOpen] = useState(false)

    const tabs = templates.map(template => ({
        ...allLocales.find(({ key }) => key === template.locale)!,
        children: <HtmlEditor
            template={template}
            setTemplate={handleTemplateSave} />,
    }))
    const [selectedIndex, setSelectedIndex] = useState(templates.findIndex(template => template.locale === params.get('locale')))

    if (tabs.length <= 0) {
        return (<>No template</>)
    }

    async function handleTemplateSave({ id, type, data }: Template) {
        const value = await api.templates.update(project.id, id, { type, data })

        const newCampaign = { ...campaign }
        newCampaign.templates = templates.map(obj => obj.id === id ? value : obj)
        setCampaign(newCampaign)
    }

    return (
        <>
            <Modal
                size="fullscreen"
                title={campaign.name}
                open
                onClose={() => navigate(`../campaigns/${campaign.id}/design`)}
            >
                <section className="email-editor">
                    <Tabs
                        selectedIndex={selectedIndex}
                        onChange={setSelectedIndex}
                        tabs={tabs}
                        append={
                            <Button
                                size="small"
                                variant="secondary"
                                onClick={() => setIsAddLocaleOpen(true)}
                            >
                                {'Edit Locales'}
                            </Button>
                        }
                    />
                </section>
            </Modal>
            <EditLocalesModal
                open={isAddLocaleOpen}
                setIsOpen={() => setIsAddLocaleOpen(false)}
                campaign={campaign}
                setCampaign={setCampaign} />
            <CreateLocaleModal
                open={false}
                setIsOpen={() => setIsAddLocaleOpen(false)}
                campaign={campaign}
                onCreate={setCampaign} />
        </>
    )
}
