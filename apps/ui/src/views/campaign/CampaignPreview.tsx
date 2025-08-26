import { useContext, useMemo, useState, useEffect } from 'react'
import { ProjectContext, TemplateContext } from '../../contexts'
import './CampaignPreview.css'
import api from '../../api'
import Preview from '../../ui/Preview'
import { toast } from 'react-hot-toast/headless'
import { debounce } from '../../utils'
import Heading from '../../ui/Heading'
import LocaleSelector from './locale/LocaleSelector'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import { Column, Columns } from '../../ui/Columns'
import TextInput from '../../ui/form/TextInput'
import Modal, { ModalProps } from '../../ui/Modal'
import { ChannelType, TemplateProofParams } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import SourceEditor from '../../ui/SourceEditor'
import { useTranslation } from 'react-i18next'
import { flattenUser } from '../../ui/utils'
import { UserLookup } from '../users/UserLookup'
import VariantSelector from './variants/VariantSelector'

interface SendProofProps extends Omit<ModalProps, 'title'> {
    type: ChannelType
    onSubmit: (recipient: string) => Promise<void>
}

const SendProof = ({ open, onClose, onSubmit, type }: SendProofProps) => {
    const { t } = useTranslation()
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t('send_proof')}
            description={`Enter the ${type === 'email' ? 'email address' : 'email or phone number'} of the recipient you want to receive the proof of this template.`}>
            <FormWrapper<TemplateProofParams>
                onSubmit={async ({ recipient }) => await onSubmit(recipient)}>
                {form => (
                    <TextInput.Field form={form} name="recipient" required />
                )}
            </FormWrapper>
        </Modal>
    )
}

export default function CampaignPreview() {

    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const { currentTemplate } = useContext(TemplateContext)
    const showAddState = useState(false)
    const [isUserLookupOpen, setIsUserLookupOpen] = useState(false)
    const [templatePreviewError, setTemplatePreviewError] = useState<string | undefined>(undefined)
    const [isSendProofOpen, setIsSendProofOpen] = useState(false)
    const [proofResponse, setProofResponse] = useState<any>(undefined)

    if (!currentTemplate) {
        return (<>
            <Heading title={t('preview')} size="h3" actions={
                <>
                    <VariantSelector />
                    <LocaleSelector showAddState={showAddState} />
                </>
            } />
            <Alert
                variant="plain"
                title={t('add_template')}
                body={t('no_template_alert_body')}
                actions={<Button onClick={() => showAddState[1](true)}>{t('create_template')}</Button>}
            />
        </>)
    }

    const [data, setData] = useState(currentTemplate.data)
    const [value, setValue] = useState<string | undefined>('{\n    "user": {},\n    "event": {}\n}')
    useEffect(() => { handleEditorChange(value) }, [value, currentTemplate])

    const handleEditorChange = useMemo(() => debounce(async (value?: string) => {
        try {
            const { data } = await api.templates.preview(project.id, currentTemplate.id, JSON.parse(value ?? '{}'))
            setTemplatePreviewError(undefined)
            setData(data)
        } catch (error: any) {
            if (error?.response?.data.error) {
                setTemplatePreviewError(error.response.data.error)
                return
            }
            setTemplatePreviewError(error.message)
        }
    }), [currentTemplate])

    const handleSendProof = async (recipient: string) => {
        try {
            const response = await api.templates.proof(project.id, currentTemplate.id, {
                variables: JSON.parse(value ?? '{}'),
                recipient,
            })
            setProofResponse(response)
        } catch (error: any) {
            if (error?.response?.data.error) {
                toast.error(error.response.data.error)
                return
            }
            toast.error(error.message)
            return
        }
        setIsSendProofOpen(false)
        currentTemplate.type === 'webhook'
            ? toast.success('Webhook test has been successfully sent!')
            : toast.success('Template proof has been successfully sent!')
    }

    return (
        <>
            <Heading title="Preview" size="h3" actions={
                <>
                    <VariantSelector />
                    <LocaleSelector showAddState={showAddState} />
                </>
            } />
            <Columns>
                <Column fullscreen={true}>
                    <Heading title="Data" size="h4" actions={
                        <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setIsUserLookupOpen(true)}
                        >{t('load_user')}</Button>
                    } />
                    <div className="preview-source-editor">
                        <SourceEditor
                            defaultLanguage="json"
                            value={value}
                            onChange={setValue}
                        />
                    </div>
                </Column>
                <Column fullscreen={true}>
                    <Heading title="Preview" size="h4" actions={
                        currentTemplate.type === 'webhook'
                            ? <Button
                                size="small"
                                variant="secondary"
                                onClick={async () => await handleSendProof('')}>{t('test_webhook')}</Button>
                            : <Button
                                size="small"
                                variant="secondary"
                                onClick={() => setIsSendProofOpen(true)}>{t('send_proof')}</Button>
                    } />
                    {templatePreviewError && <Alert
                        variant="warn"
                        title={t('template_error')}>
                        {t('template_handlebars_error')}{templatePreviewError}
                    </Alert>}
                    <Preview template={{ type: currentTemplate.type, data }} response={proofResponse} />
                </Column>
            </Columns>

            <UserLookup
                open={isUserLookupOpen}
                onClose={setIsUserLookupOpen}
                onSelected={user => {
                    setValue(JSON.stringify({
                        user: flattenUser(user),
                        event: {},
                    }, undefined, 4))
                }} />
            <SendProof
                open={isSendProofOpen}
                onClose={setIsSendProofOpen}
                onSubmit={handleSendProof}
                type={currentTemplate.type} />
        </>
    )
}
