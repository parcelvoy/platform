import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import { CampaignContext, ProjectContext } from '../../../contexts'
import { Template, TemplateUpdateParams } from '../../../types'
import Button, { LinkButton } from '../../../ui/Button'
import { Column, Columns } from '../../../ui/Columns'
import Heading from '../../../ui/Heading'
import Modal from '../../../ui/Modal'
import Preview from '../../../ui/Preview'
import FormWrapper from '../../../ui/form/FormWrapper'
import { EmailForm, EmailTable } from './EmailTemplate'
import { InAppForm, InAppTable } from './InAppTemplate'
import { PushForm, PushTable } from './PushTemplate'
import { TextForm, TextTable } from './TextTemplate'
import { WebhookForm, WebhookTable } from './WebhookTemplate'

interface TemplateDetailProps {
    template: Template
}

export default function TemplateDetail({ template }: TemplateDetailProps) {

    const { t } = useTranslation()
    const [{ id, type, data }, setTemplate] = useState(template)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const [project] = useContext(ProjectContext)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const showCodeEditor = type === 'email' || type === 'in_app'

    async function handleTemplateSave(params: TemplateUpdateParams) {
        const value = await api.templates.update(project.id, id, params)
        setTemplate(value)

        const newCampaign = { ...campaign }
        newCampaign.templates = campaign.templates.map(obj => obj.id === id ? value : obj)
        setCampaign(newCampaign)
        setIsEditOpen(false)
    }

    return (
        <>
            <Columns>
                <Column>
                    <Heading title={t('details')} size="h4" actions={
                        campaign.state !== 'finished' && <Button size="small" variant="secondary" onClick={() => { setIsEditOpen(true) }}>{t('edit_details')}</Button>
                    } />
                    {
                        {
                            email: <EmailTable data={data} />,
                            text: <TextTable data={data} />,
                            push: <PushTable data={data} />,
                            webhook: <WebhookTable data={data} />,
                            in_app: <InAppTable data={data} />,
                        }[type]
                    }
                </Column>

                <Column fullscreen={true}>
                    <Heading title={t('design')} size="h4" actions={
                        showCodeEditor && campaign.state !== 'finished' && <LinkButton size="small" variant="secondary" to={`../editor?template=${template.id}`}>{t('edit_design')}</LinkButton>
                    } />
                    <Preview template={{ type, data }} />
                </Column>
            </Columns>

            <Modal title={t('edit_template_details')}
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
            >
                <FormWrapper<TemplateUpdateParams>
                    onSubmit={handleTemplateSave}
                    defaultValues={{ data }}
                    submitLabel="Save"
                >
                    {form => <>
                        {
                            {
                                email: <EmailForm form={form} />,
                                text: <TextForm form={form} />,
                                push: <PushForm form={form} />,
                                webhook: <WebhookForm form={form} />,
                                in_app: <InAppForm form={form} />,
                            }[type]
                        }
                    </>}
                </FormWrapper>
            </Modal>
        </>
    )
}
