import { useContext, useState } from 'react'
import { CampaignContext, ProjectContext } from '../../contexts'
import SourceEditor from '@monaco-editor/react'
import './EmailEditor.css'
import Button, { LinkButton } from '../../ui/Button'
import api from '../../api'
import { Template } from '../../types'
import { useSearchParams } from 'react-router-dom'
import Preview from '../../ui/Preview'
import { locales } from './CampaignDetail'
import Tabs from '../../ui/Tabs'
import { formatDate } from '../../utils'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { route } from '../router'
import CreateLocaleModal from './CreateLocaleModal'

// type EditorType = 'html' | 'builder'

const HtmlEditor = ({ template, setTemplate }: { template: Template, setTemplate: (template: Template) => void }) => {

    const [preferences] = useContext(PreferencesContext)
    const [data, setData] = useState(template.data)
    const [selectedIndex, setSelectedIndex] = useState(0)

    function handleHtmlChange(html?: string) {
        setData({ ...data, html })
    }

    function handleTextChange(text?: string) {
        setData({ ...data, text })
    }

    function handleSave() {
        template.data = data
        setTemplate(template)
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
                            children: <SourceEditor
                                height="100%"
                                defaultLanguage="handlebars"
                                defaultValue={data.html}
                                onChange={handleHtmlChange}
                                options={{ wordWrap: 'on' }}
                                theme="vs-dark"
                            />,
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
                        }]} />
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
                <Button onClick={() => handleSave()}>Save</Button>
            </div>
        </>
    )
}

export default function EmailEditor() {

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
            <section className="email-editor">
                <div className="email-editor-header">
                    <LinkButton variant="secondary" icon="x-lg" to={route(`campaigns/${campaign.id}/design`)}>Exit</LinkButton>
                    <h3>{campaign.name}</h3>
                </div>
                <Tabs
                    selectedIndex={selectedIndex}
                    onChange={setSelectedIndex}
                    tabs={tabs}
                    append={
                        <Button size="small"
                            variant="secondary"
                            onClick={() => setIsAddLocaleOpen(true)}>Add Locale</Button>
                    } />
            </section>
            <CreateLocaleModal
                open={isAddLocaleOpen}
                setIsOpen={() => setIsAddLocaleOpen(false)}
                campaign={campaign}
                setCampaign={setCampaign} />
        </>
    )
}
