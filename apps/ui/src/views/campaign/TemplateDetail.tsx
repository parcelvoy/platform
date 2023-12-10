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
import { EmailTemplateData, PushTemplateData, Template, TemplateUpdateParams, TextTemplateData, WebhookTemplateData } from '../../types'
import TextInput from '../../ui/form/TextInput'
import api from '../../api'
import { SingleSelect } from '../../ui/form/SingleSelect'
import JsonField from '../../ui/form/JsonField'

const EmailTable = ({ data }: { data: EmailTemplateData }) => <InfoTable rows={{
    'From Email': data.from?.address,
    'From Name': data.from?.name,
    'Reply To': data.reply_to,
    CC: data.cc,
    BCC: data.bcc,
    Subject: data.subject,
    Preheader: data.preheader,
}} />

const EmailForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <TextInput.Field form={form} name="data.from.name" label="From Name" required />
    <TextInput.Field form={form} name="data.from.address" label="From Email" required />
    <TextInput.Field
        form={form}
        name="data.subject"
        label="Subject"
        textarea
        required />
    <TextInput.Field
        form={form}
        name="data.preheader"
        label="Preheader"
        textarea />
    <TextInput.Field form={form} name="data.reply_to" label="Reply To" />
    <TextInput.Field form={form} name="data.cc" label="CC" />
    <TextInput.Field form={form} name="data.bcc" label="BCC" />
</>

const TextTable = ({ data: { text } }: { data: TextTemplateData }) => {
    const [project] = useContext(ProjectContext)
    const segmentLength = 160
    const optOutLength = project.text_opt_out_message?.length ?? 0
    const length = (text?.length ?? 0) + optOutLength
    const segments = Math.ceil(length / segmentLength)
    return <InfoTable rows={{
        Text: text,
        Info: `${length}/${segmentLength} characters, ${segments} segment${segments > 1 ? 's' : ''}`,
    }} />
}

const TextForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <TextInput.Field
        form={form}
        name="data.text"
        label="Message"
        textarea
        required />
</>

const PushTable = ({ data }: { data: PushTemplateData }) => <InfoTable rows={{
    Title: data.title,
    Body: data.body,
    Deeplink: data.url,
    'Raw JSON': JSON.stringify(data.custom),
}} />

const PushForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <TextInput.Field
        form={form}
        name="data.title"
        label="Title"
        required />
    <TextInput.Field
        form={form}
        name="data.body"
        label="Body"
        textarea
        required />
    <TextInput.Field
        form={form}
        name="data.url"
        label="Deeplink" />
    <JsonField
        form={form}
        name="data.custom"
        label="Raw JSON"
        textarea />
</>

const WebhookTable = ({ data }: { data: WebhookTemplateData }) => <InfoTable rows={{
    Method: data.method,
    Endpoint: data.endpoint,
    Headers: JSON.stringify(data.headers),
    Body: JSON.stringify(data.body),
}} />

const WebhookForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => <>
    <SingleSelect.Field
        form={form}
        name="data.method"
        label="Method"
        options={['DELETE', 'GET', 'PATCH', 'POST', 'PUT']}
        required />
    <TextInput.Field
        form={form}
        name="data.endpoint"
        label="Endpoint"
        required />
    <JsonField
        form={form}
        name="data.headers"
        label="Headers"
        textarea />
    <JsonField
        form={form}
        name="data.body"
        label="Body"
        textarea />
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
                            webhook: <WebhookTable data={data} />,
                        }[type]
                    }
                </Column>

                <Column>
                <Column fullscreen={true}>
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
                                webhook: <WebhookForm form={form} />,
                            }[type]
                        }
                    </>}
                </FormWrapper>
            </Modal>
        </>
    )
}
