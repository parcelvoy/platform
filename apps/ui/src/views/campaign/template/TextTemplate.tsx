import { useTranslation } from 'react-i18next'
import { TemplateUpdateParams, TextTemplateData } from '../../../types'
import { useContext } from 'react'
import { ProjectContext } from '../../../contexts'
import { Alert, Heading, InfoTable, Tag } from '../../../ui'
import { UseFormReturn } from 'react-hook-form'
import TextInput from '../../../ui/form/TextInput'

export const TextTable = ({ data: { text } }: { data: TextTemplateData }) => {
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

export const TextForm = ({ form }: { form: UseFormReturn<TemplateUpdateParams, any> }) => {
    const { t } = useTranslation()
    return <TextInput.Field
        form={form}
        name="data.text"
        label={t('message')}
        textarea
        required />
}
