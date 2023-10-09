import { SetStateAction, Suspense, lazy, useContext, useState } from 'react'
import { CampaignContext, LocaleContext, LocaleSelection, ProjectContext } from '../../../contexts'
import './EmailEditor.css'
import Button, { LinkButton } from '../../../ui/Button'
import api from '../../../api'
import { Campaign, Template } from '../../../types'
import { useNavigate } from 'react-router-dom'
import { localeState } from '../CampaignDetail'
import Modal from '../../../ui/Modal'
import HtmlEditor from './HtmlEditor'
import LocaleSelector from '../LocaleSelector'
import { toast } from 'react-hot-toast/headless'
import { QuestionIcon } from '../../../ui/icons'

const VisualEditor = lazy(async () => await import('./VisualEditor'))

export default function EmailEditor() {
    const navigate = useNavigate()
    const [project] = useContext(ProjectContext)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const { templates } = campaign

    const [locale, setLocale] = useState<LocaleSelection>(localeState(templates ?? []))

    const [template, setTemplate] = useState<Template | undefined>(templates[0])
    const [isSaving, setIsSaving] = useState(false)

    async function handleTemplateSave({ id, type, data }: Template) {
        setIsSaving(true)
        try {
            const value = await api.templates.update(project.id, id, { type, data })

            const newCampaign = { ...campaign }
            newCampaign.templates = templates.map(obj => obj.id === id ? value : obj)
            setCampaign(newCampaign)
            toast.success('Template saved!')
        } finally {
            setIsSaving(false)
        }
    }

    const campaignChange = (change: SetStateAction<Campaign>) => {
        setCampaign(change)
    }

    return (
        <>
            <LocaleContext.Provider value={[locale, setLocale]}>
                <Modal
                    size="fullscreen"
                    title={campaign.name}
                    open
                    onClose={() => navigate(`../campaigns/${campaign.id}/design?locale=${locale.currentLocale?.key}`)}
                    actions={
                        <>
                            <LinkButton
                                icon={<QuestionIcon />}
                                variant="secondary"
                                size="small"
                                to="https://docs.parcelvoy.com/how-to/campaigns/templates"
                                target="_blank" />
                            <LocaleSelector campaignState={[campaign, campaignChange]} />
                            {template && (
                                <Button
                                    size="small"
                                    isLoading={isSaving}
                                    onClick={async () => await handleTemplateSave(template)}
                                >Save Template</Button>
                            )}
                        </>
                    }
                >
                    <section className="email-editor">
                        {templates.filter(template => template.locale === locale.currentLocale?.key)
                            .map(template => (
                                template.data.editor === 'visual'
                                    ? (
                                        <Suspense key={template.id} fallback={null}>
                                            <VisualEditor
                                                template={template}
                                                setTemplate={setTemplate}
                                            />
                                        </Suspense>
                                    )
                                    : <HtmlEditor
                                        template={template}
                                        key={template.id}
                                        setTemplate={setTemplate} />
                            ))
                        }
                    </section>
                </Modal>
            </LocaleContext.Provider>
        </>
    )
}
