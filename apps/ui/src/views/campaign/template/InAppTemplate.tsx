import { UseFormReturn } from 'react-hook-form'
import { InAppTemplateData, TemplateUpdateParams } from '../../../types'
import { InfoTable, Tag } from '../../../ui'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import TextInput from '../../../ui/form/TextInput'
import JsonField from '../../../ui/form/JsonField'
import SwitchField from '../../../ui/form/SwitchField'
import { useTranslation } from 'react-i18next'

export const InAppTable = ({ data }: { data: InAppTemplateData }) => {
    const { t } = useTranslation()
    return <InfoTable rows={{
        [t('type')]: data.type ? t(data.type) : <Tag variant="warn">{t('missing')}</Tag>,
        [t('title')]: data.title ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('body')]: data.body ?? <Tag variant="warn">{t('missing')}</Tag>,
        [t('read_on_view')]: data.read_on_view,
        [t('raw_json')]: JSON.stringify(data.custom),
    }} />
}

export const InAppForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
    const { t } = useTranslation()
    return <>
        <SingleSelect.Field
            form={form}
            name="data.type"
            label="Method"
            options={[
                // { key: 'alert', label: t('alert') },
                { key: 'html', label: t('html') },
            ]}
            toValue={v => v.key}
            required />
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
        <SwitchField
            form={form}
            name="data.read_on_view"
            label="Read On View"
            subtitle="Should this in app message be marked as read when its viewed or only when dismissed?" />
        <JsonField
            form={form}
            name="data.custom"
            label="Custom"
            textarea />
    </>
}
