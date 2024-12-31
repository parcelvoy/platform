import { useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { CampaignContext, LocaleContext, ProjectContext } from '../../contexts'
import './CampaignPreview.css'
import api from '../../api'
import Preview from '../../ui/Preview'
import { toast } from 'react-hot-toast/headless'
import { debounce } from '../../utils'
import Heading from '../../ui/Heading'
import LocaleSelector from './LocaleSelector'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import { Column, Columns } from '../../ui/Columns'
import TextInput from '../../ui/form/TextInput'
import ButtonGroup from '../../ui/ButtonGroup'
import Modal, { ModalProps } from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { ChannelType, TemplateProofParams, User } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import SourceEditor from '../../ui/SourceEditor'
import { useTranslation } from 'react-i18next'
import { flattenUser } from '../../ui/utils'

interface UserLookupProps extends Omit<ModalProps, 'title'> {
    onSelected: (user: User) => void
}

const UserLookup = ({ open, onClose, onSelected }: UserLookupProps) => {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const state = useSearchTableState(useCallback(async params => await api.users.search(project.id, params), [project]))
    const [value, setValue] = useState<string>('')

    return <Modal
        title={t('user_lookup')}
        open={open}
        onClose={onClose}
        size="regular">
        <div className="user-lookup">
            <ButtonGroup>
                <TextInput<string>
                    name="search"
                    placeholder={(t('enter_email'))}
                    hideLabel={true}
                    value={value}
                    onChange={setValue} />
                <Button
                    variant="secondary"
                    onClick={() => state.setParams({
                        ...state.params,
                        q: value,
                    })}>{t('search')}</Button>
            </ButtonGroup>
            <SearchTable
                {...state}
                columns={[
                    { key: 'full_name', title: 'Name' },
                    { key: 'email' },
                    { key: 'phone' },
                ]}
                onSelectRow={(user) => {
                    onSelected(user)
                    onClose(false)
                }} />
        </div>
    </Modal>
}

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
    const campaignState = useContext(CampaignContext)
    const [{ currentLocale }] = useContext(LocaleContext)
    const showAddState = useState(false)
    const [isUserLookupOpen, setIsUserLookupOpen] = useState(false)
    const [isSendProofOpen, setIsSendProofOpen] = useState(false)
    const template = campaignState[0].templates.find(template => template.locale === currentLocale?.key)

    if (!template) {
        return (<>
            <Heading title={t('preview')} size="h3" actions={
                <LocaleSelector
                    campaignState={campaignState}
                    showAddState={showAddState} />
            } />
            <Alert
                variant="plain"
                title={t('add_template')}
                body={t('no_template_alert_body')}
                actions={<Button onClick={() => showAddState[1](true)}>{t('create_template')}</Button>}
            />
        </>)
    }

    const [data, setData] = useState(template.data)
    const [value, setValue] = useState<string | undefined>('{\n    "user": {},\n    "event": {}\n}')
    useEffect(() => { handleEditorChange(value) }, [value, template])

    const handleEditorChange = useMemo(() => debounce(async (value?: string) => {
        try {
            const { data } = await api.templates.preview(project.id, template.id, JSON.parse(value ?? '{}'))
            setData(data)
        } catch {}
    }), [template])

    const handleSendProof = async (recipient: string) => {
        try {
            await api.templates.proof(project.id, template.id, {
                variables: JSON.parse(value ?? '{}'),
                recipient,
            })
        } catch (error: any) {
            if (error.response.data.error) {
                toast.error(error.response.data.error)
                return
            }
            toast.error(error.message)
            return
        }
        setIsSendProofOpen(false)
        template.type === 'webhook'
            ? toast.success('Webhook test has been successfully sent!')
            : toast.success('Template proof has been successfully sent!')
    }

    return (
        <>
            <Heading title="Preview" size="h3" actions={
                <LocaleSelector
                    campaignState={campaignState}
                    showAddState={showAddState} />
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
                        template.type === 'webhook'
                            ? <Button
                                size="small"
                                variant="secondary"
                                onClick={async () => await handleSendProof('')}>{t('test_webhook')}</Button>
                            : <Button
                                size="small"
                                variant="secondary"
                                onClick={() => setIsSendProofOpen(true)}>{t('send_proof')}</Button>
                    } />
                    <Preview template={{ type: template.type, data }} />
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
                type={template.type} />
        </>
    )
}
