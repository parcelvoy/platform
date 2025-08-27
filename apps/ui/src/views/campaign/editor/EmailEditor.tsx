import { SetStateAction, Suspense, lazy, useContext, useEffect, useState } from 'react'
import { CampaignContext, ProjectContext, TemplateContext } from '../../../contexts'
import './EmailEditor.css'
import Button, { LinkButton } from '../../../ui/Button'
import api from '../../../api'
import { Resource, Template } from '../../../types'
import { useBlocker, useNavigate } from 'react-router'
import Modal from '../../../ui/Modal'
import HtmlEditor from './HtmlEditor'
import LocaleSelector from '../locale/LocaleSelector'
import { toast } from 'react-hot-toast/headless'
import { QuestionIcon } from '../../../ui/icons'
import { useTranslation } from 'react-i18next'
import ResourceModal from './ResourceModal'
import { TemplateContextProvider } from '../template/TemplateContextProvider'
import VariantSelector from '../variants/VariantSelector'

const VisualEditor = lazy(async () => await import('./VisualEditor'))

function EmailEditor() {

    const navigate = useNavigate()
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const { campaign, setCampaign, currentTemplate } = useContext(TemplateContext)
    const { templates } = campaign

    const [resources, setResources] = useState<Resource[]>([])

    const [template, setTemplate] = useState<Template | undefined>(templates[0])
    const [isSaving, setIsSaving] = useState(false)
    const [showConfig, setShowConfig] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        api.resources.all(project.id)
            .then(resources => setResources(resources))
            .catch(() => setResources([]))
    }, [])

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
    )

    useEffect(() => {
        if (blocker.state !== 'blocked') return
        if (confirm(t('confirm_unsaved_changes'))) {
            blocker.proceed()
        } else {
            blocker.reset()
        }
    }, [blocker.state])

    async function handleTemplateSave({ id, data }: Template) {
        setIsSaving(true)
        try {
            const value = await api.templates.update(project.id, id, { data })

            const newCampaign = { ...campaign }
            newCampaign.templates = templates.map(obj => obj.id === id ? value : obj)
            setCampaign(newCampaign)
            toast.success(t('template_saved'))
        } finally {
            setHasUnsavedChanges(false)
            setIsSaving(false)
        }
    }

    const handleTemplateChange = (change: SetStateAction<Template | undefined>) => {
        setHasUnsavedChanges(true)
        setTemplate(change)
    }

    return (
        <Modal
            size="fullscreen"
            title={campaign.name}
            open
            onClose={async () => {
                await navigate(`../campaigns/${campaign.id}/design?template=${currentTemplate?.id}`)
            }}
            actions={
                <>
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setShowConfig(true)}
                    >Config</Button>
                    <LinkButton
                        icon={<QuestionIcon />}
                        variant="secondary"
                        size="small"
                        to="https://docs.parcelvoy.com/how-to/campaigns/templates"
                        target="_blank" />
                    <VariantSelector />
                    <LocaleSelector />
                    {template && (
                        <Button
                            size="small"
                            isLoading={isSaving}
                            onClick={async () => await handleTemplateSave(template)}
                        >{t('template_save')}</Button>
                    )}
                </>
            }
        >
            {currentTemplate && <section className="email-editor">
                {currentTemplate?.data.editor === 'visual'
                    ? (
                        <Suspense key={currentTemplate.id} fallback={null}>
                            <VisualEditor
                                template={currentTemplate}
                                setTemplate={handleTemplateChange}
                                resources={resources}
                            />
                        </Suspense>
                    )
                    : <HtmlEditor
                        template={currentTemplate}
                        key={currentTemplate.id}
                        setTemplate={handleTemplateChange} />
                }
            </section>}

            <ResourceModal
                open={showConfig}
                onClose={() => setShowConfig(false)}
                resources={resources}
                setResources={setResources}
            />
        </Modal>
    )
}

export default function EmailEditorWrapper() {
    const [campaign, setCampaign] = useContext(CampaignContext)
    return (
        <>
            <TemplateContextProvider campaign={campaign} setCampaign={setCampaign}>
                <EmailEditor />
            </TemplateContextProvider>
        </>
    )
}
