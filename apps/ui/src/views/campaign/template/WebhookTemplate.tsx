import { useTranslation } from 'react-i18next'
import { TemplateUpdateParams, WebhookTemplateData } from '../../../types'
import { InfoTable, Tag } from '../../../ui'
import { UseFormReturn } from 'react-hook-form'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import JsonField from '../../../ui/form/JsonField'
import TextInput from '../../../ui/form/TextInput'

export const WebhookTable = ({ data }: { data: WebhookTemplateData }) => {
    const { t } = useTranslation()
    return <InfoTable rows={{
        [t('method')]: data.method ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('endpoint')]: data.endpoint ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('headers')]: JSON.stringify(data.headers),
        [t('body')]: JSON.stringify(data.body),
        [t('cache_key')]: data.cache_key,
    }} />
}

export const WebhookForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
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
