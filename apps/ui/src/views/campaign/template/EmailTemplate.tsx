import { useTranslation } from 'react-i18next'
import { EmailTemplateData, TemplateUpdateParams } from '../../../types'
import { useContext } from 'react'
import { TemplateContext } from '../../../contexts'
import { InfoTable, Tag } from '../../../ui'
import { UseFormReturn } from 'react-hook-form'
import TextInput from '../../../ui/form/TextInput'

export const EmailTable = ({ data }: { data: EmailTemplateData }) => {
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

export const EmailForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
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
