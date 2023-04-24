import { SetStateAction, useContext, useState } from 'react'
import { CampaignContext, LocaleContext, LocaleSelection, ProjectContext } from '../../../contexts'
import './EmailEditor.css'
import Button from '../../../ui/Button'
import api from '../../../api'
import { Campaign, Template } from '../../../types'
import { useNavigate } from 'react-router-dom'
import { localeState } from '../CampaignDetail'
import Modal from '../../../ui/Modal'
import VisualEditor from './VisualEditor'
import HtmlEditor from './HtmlEditor'
import LocaleSelector from '../LocaleSelector'
import Stack from '../../../ui/Stack'

export default function EmailEditor() {
    const navigate = useNavigate()
    // const [params] = useSearchParams()
    const [project] = useContext(ProjectContext)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const { templates } = campaign
    const [locale, setLocale] = useState<LocaleSelection>(localeState(templates ?? []))
    const localeOpenState = useState(false)
    const [template, setTemplate] = useState<Template | undefined>(templates[0])

    async function handleTemplateSave({ id, type, data }: Template) {
        const value = await api.templates.update(project.id, id, { type, data })

        const newCampaign = { ...campaign }
        newCampaign.templates = templates.map(obj => obj.id === id ? value : obj)
        setCampaign(newCampaign)
    }

    const campaignChange = (change: SetStateAction<Campaign>) => {
        console.log('campaign change!', change)
        setCampaign(change)
    }

    return (
        <>
            <LocaleContext.Provider value={[locale, setLocale]}>
                <Modal
                    size="fullscreen"
                    title={campaign.name}
                    open
                    onClose={() => navigate(`../campaigns/${campaign.id}/design`)}
                    actions={
                        <Stack>
                            <LocaleSelector
                                campaignState={[campaign, campaignChange]}
                                openState={localeOpenState} />
                            {template && <Button size="small" onClick={async () => await handleTemplateSave(template)}>Save Template</Button>}
                        </Stack>
                    }
                >
                    <section className="email-editor">
                        {templates.filter(template => template.locale === locale.currentLocale?.key)
                            .map(template => (
                                template.data.editor === 'visual'
                                    ? <VisualEditor
                                        template={template}
                                        key={template.id}
                                        setTemplate={setTemplate} />
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
