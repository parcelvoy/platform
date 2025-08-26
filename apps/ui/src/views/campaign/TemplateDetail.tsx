import { useContext, useState } from 'react'
import { CampaignContext, ProjectContext, TemplateContext } from '../../contexts'
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
import { Alert, Tag } from '../../ui'
import { useTranslation } from 'react-i18next'

const EmailTable = ({ data }: { data: EmailTemplateData }) => {
    const { t } = useTranslation()
    const { currentTemplate, variants } = useContext(TemplateContext)
    const validate = (field: string, value: string | undefined, required = true) => {
        if (!value && required) return <Tag variant="warn">{t('missing')}</Tag>
        if (['cc', 'bcc', 'reply_to', 'from_email'].includes(field) && value && !value.includes('@')) {
            return <Tag variant="warn">{t('invalid_email')}: &quot;{value}&quot;</Tag>
        }
        return value
    }

    return <>
        <InfoTable rows={{
            ...variants.length ? { [t('variant')]: currentTemplate?.name } : {},
            [t('from_email')]: validate('from_email', data.from?.address),
            [t('from_name')]: validate('from_name', data.from?.name),
            [t('reply_to')]: validate('reply_to', data.reply_to, false),
            [t('cc')]: validate('cc', data.cc, false),
            [t('bcc')]: validate('bcc', data.bcc, false),
            [t('subject')]: validate('subject', data.subject),
            [t('preheader')]: data.preheader,
        }} />
    </>
}

const EmailForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
    const { t } = useTranslation()
    return <>
        <TextInput.Field form={form} name="data.from.name" label={t('from_name')} required />
        <TextInput.Field
            form={form}
            name="data.from.address"
            label={t('from_email')}
            type="email"
            required />
        <TextInput.Field
            form={form}
            name="data.subject"
            label={t('subject')}
            textarea
            required />
        <TextInput.Field
            form={form}
            name="data.preheader"
            label={t('preheader')}
            textarea />
        <TextInput.Field form={form} name="data.reply_to" label={t('reply_to')} />
        <TextInput.Field form={form} name="data.cc" label={t('cc')} />
        <TextInput.Field form={form} name="data.bcc" label={t('bcc')} />
    </>
}

const TextTable = ({ data: { text } }: { data: TextTemplateData }) => {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const segmentLength = 160
    const optOutLength = project.text_opt_out_message?.length ?? 0
    const baseLength = (text?.length ?? 0)
    const totalLength = baseLength + optOutLength
    const isHandlebars = text?.includes('{{') ?? false

    const lengthStr = (length: number) => {
        const segments = Math.ceil(length / segmentLength)
        return `${isHandlebars ? '~' : ''}${length}/${segmentLength} characters, ${segments} segment${segments > 1 ? 's' : ''}`
    }

    return <>
        <InfoTable rows={{
            Text: text ?? <Tag variant="warn">{t('missing')}</Tag>,
        }} />
        <Heading title="Send Details" size="h4" />
        {baseLength > segmentLength && <Alert variant="plain" title="Note" body={`Carriers calculate your send rate as segments per second not messages per second. This campaign will take approximately ${Math.ceil(baseLength / segmentLength)}x longer to send due to its length.`} />}
        <InfoTable rows={{
            'Existing User Length': lengthStr(baseLength),
            'New User Length': lengthStr(totalLength),
        }} />
    </>
}

const TextForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
    const { t } = useTranslation()
    return <TextInput.Field
        form={form}
        name="data.text"
        label={t('message')}
        textarea
        required />
}

const PushTable = ({ data }: { data: PushTemplateData }) => {
    const { t } = useTranslation()
    return <InfoTable rows={{
        [t('title')]: data.title ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('body')]: data.body ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('deeplink')]: data.url,
        [t('raw_json')]: JSON.stringify(data.custom),
    }} />
}

const PushForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
    const { t } = useTranslation()
    return <>
        <TextInput.Field
            form={form}
            name="data.title"
            label={t('title')}
            required />
        <TextInput.Field
            form={form}
            name="data.body"
            label={t('body')}
            textarea
            required />
        <TextInput.Field
            form={form}
            name="data.url"
            label={t('deeplink')} />
        <JsonField
            form={form}
            name="data.custom"
            label={t('raw_json')}
            textarea />
    </>
}

const WebhookTable = ({ data }: { data: WebhookTemplateData }) => {
    const { t } = useTranslation()
    return <InfoTable rows={{
        [t('method')]: data.method ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('endpoint')]: data.endpoint ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('headers')]: JSON.stringify(data.headers),
        [t('body')]: JSON.stringify(data.body),
        [t('cache_key')]: data.cache_key,
    }} />
}

const WebhookForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
    const { t } = useTranslation()
    return <>
        <SingleSelect.Field
            form={form}
            name="data.method"
            label={t('method')}
            options={['DELETE', 'GET', 'PATCH', 'POST', 'PUT']}
            required />
        <TextInput.Field
            form={form}
            name="data.endpoint"
            label={t('endpoint')}
            required />
        <JsonField
            form={form}
            name="data.headers"
            label={t('headers')}
            textarea />
        <JsonField
            form={form}
            name="data.body"
            label={t('body')}
            textarea />
        <TextInput.Field
            form={form}
            name="data.cache_key"
            label={t('cache_key')}
            subtitle={t('cache_key_subtitle')} />
    </>
}

interface TemplateDetailProps {
    template: Template
}

export default function TemplateDetail({ template }: TemplateDetailProps) {

    const { t } = useTranslation()
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
                    <Heading title={t('details')} size="h4" actions={
                        campaign.state !== 'finished' && <Button size="small" variant="secondary" onClick={() => { setIsEditOpen(true) }}>{t('edit_details')}</Button>
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

                <Column fullscreen={true}>
                    <Heading title={t('design')} size="h4" actions={
                        type === 'email' && campaign.state !== 'finished' && <LinkButton size="small" variant="secondary" to={`../editor?template=${template.id}`}>{t('edit_design')}</LinkButton>
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
                            }[type]
                        }
                    </>}
                </FormWrapper>
            </Modal>
        </>
    )
}
