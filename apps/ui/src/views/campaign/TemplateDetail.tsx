import { useContext, useState } from 'react'
import { CampaignContext, ProjectContext } from '../../contexts'
import Button, { LinkButton } from '../../ui/Button'
import { Column, Columns } from '../../ui/Columns'
import { UseFormReturn } from 'react-hook-form'
import Heading from '../../ui/Heading'
import Preview from '../../ui/Preview'
import { InfoTable } from '../../ui/InfoTable'
import Modal from '../../ui/Modal'
import FormWrapper from '../../ui/form/FormWrapper'
import { EmailTemplateData, PushTemplateData, Template, TemplateUpdateParams, TextTemplateData } from '../../types'
import TextField from '../../ui/form/TextField'
import api from '../../api'

const EmailTable = ({ data }: { data: EmailTemplateData }) => <InfoTable rows={{
    'From Email': data.from,
    'Reply To': data.reply_to,
    CC: data.cc,
    BCC: data.bcc,
    Subject: data.subject,
    Preheader: data.preheader,
}} />

const EmailForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <TextField
        form={form}
        name="data.subject"
        label="Subject"
        textarea
        required />
    <TextField
        form={form}
        name="data.preheader"
        label="Preheader"
        textarea />
    <TextField form={form} name="data.from" label="From Email" required />
    <TextField form={form} name="data.reply_to" label="Reply To" />
    <TextField form={form} name="data.cc" label="CC" />
    <TextField form={form} name="data.bcc" label="BCC" />
</>

const TextTable = ({ data: { text } }: { data: TextTemplateData }) => {
    const segmentLength = 160
    const optOutLength = 48
    const length = (text?.length ?? 0) + optOutLength
    const segments = Math.ceil(length / segmentLength)
    return <InfoTable rows={{
        Text: text,
        Info: `${length}/${segmentLength} characters, ${segments} segment${segments > 1 ? 's' : ''}`,
    }} />
}

const TextForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <TextField
        form={form}
        name="data.text"
        label="Message"
        textarea
        required />
</>

const PushTable = ({ data }: { data: PushTemplateData }) => <InfoTable rows={{
    Title: data.title,
    Body: data.body,
    Topic: data.topic,
}} />

const PushForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <TextField
        form={form}
        name="data.title"
        label="Title"
        required />
    <TextField
        form={form}
        name="data.body"
        label="Body"
        textarea
        required />
    <TextField
        form={form}
        name="data.topic"
        label="Topic"
        required />
</>

interface TemplateDetailProps {
    template: Template
}

export default function TemplateDetail({ template }: TemplateDetailProps) {

    const [{ id, type, data }, setTemplate] = useState(template)
    const [campaign, setCampaign] = useContext(CampaignContext)
    const [project] = useContext(ProjectContext)
    const [isEditOpen, setIsEditOpen] = useState(false)

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
                    <Heading title="Details" size="h4" actions={
                        campaign.state !== 'finished' && <Button size="small" variant="secondary" onClick={() => { setIsEditOpen(true) }}>Edit Details</Button>
                    } />
                    {
                        {
                            email: <EmailTable data={data} />,
                            text: <TextTable data={data} />,
                            push: <PushTable data={data} />,
                            webhook: <></>,
                        }[type]
                    }
                </Column>

                <Column>
                    <Heading title="Design" size="h4" actions={
                        type === 'email' && campaign.state !== 'finished' && <LinkButton size="small" variant="secondary" to={`../editor?locale=${template.locale}`}>Edit Design</LinkButton>
                    } />
                    <Preview template={{ type, data }} />
                </Column>
            </Columns>

            <Modal title="Edit Template Details"
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
            >
                <FormWrapper<TemplateUpdateParams>
                    onSubmit={handleTemplateSave}
                    defaultValues={{ type, data }}
                    submitLabel="Save"
                >
                    {form => <>
                        {
                            {
                                email: <EmailForm form={form} />,
                                text: <TextForm form={form} />,
                                push: <PushForm form={form} />,
                                webhook: <></>,
                            }[type]
                        }
                    </>}
                </FormWrapper>
            </Modal>
        </>
    )
}
