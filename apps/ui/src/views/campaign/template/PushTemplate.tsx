import { useTranslation } from 'react-i18next'
import { PushTemplateData, TemplateUpdateParams } from '../../../types'
import { InfoTable, Tag } from '../../../ui'
import { UseFormReturn } from 'react-hook-form'
import TextInput from '../../../ui/form/TextInput'
import JsonField from '../../../ui/form/JsonField'

export const PushTable = ({ data }: { data: PushTemplateData }) => {
    const { t } = useTranslation()
    return <InfoTable rows={{
        [t('title')]: data.title ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('body')]: data.body ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('deeplink')]: data.url,
        [t('raw_json')]: JSON.stringify(data.custom),
    }} />
}

export const PushForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
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
