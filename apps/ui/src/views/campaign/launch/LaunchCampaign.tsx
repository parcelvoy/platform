import { formatISO, isPast } from 'date-fns'
import { useContext, useState } from 'react'
import api from '../../../api'
import { CampaignContext, ProjectContext, TemplateContext } from '../../../contexts'
import { Campaign, CampaignLaunchParams } from '../../../types'
import RadioInput from '../../../ui/form/RadioInput'
import SwitchField from '../../../ui/form/SwitchField'
import FormWrapper from '../../../ui/form/FormWrapper'
import Modal from '../../../ui/Modal'
import Alert from '../../../ui/Alert'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import DateTimeField from './DateTimeField'
import { Button, InfoTable } from '../../../ui'
import { snakeToTitle } from '../../../utils'
import { localeOption } from '../TemplateContextProvider'
import { DelimitedLists } from '../ui/DelimitedItems'
import { UseFormReturn, useWatch } from 'react-hook-form'

interface LaunchCampaignParams {
    open: boolean
    onClose: (open: boolean) => void
}

interface LaunchConfirmationProps {
    campaign: Campaign
    onSubmit: () => void
}
function LaunchConfirmation({ campaign, onSubmit }: LaunchConfirmationProps) {
    const { t } = useTranslation()
    const { variants, variantMap, locales } = useContext(TemplateContext)
    const variantList = Object.entries(variantMap).map(([locale, variants]) => `${localeOption(locale).shortLabel} (${variants.length}x)`).join(', ')
    return <>
        <p>{t('launch_confirmation_subtitle')}</p>
        <InfoTable rows={{
            [t('name')]: campaign.name,
            [t('channel')]: t(campaign.channel),
            [t('send_at')]: campaign.send_at ? new Date(campaign.send_at).toLocaleString() : t(snakeToTitle('now')),
            [t('send_at')]: campaign.send_at ? new Date(campaign.send_at).toLocaleString() : t(snakeToTitle('now')),
            [t('send_lists')]: DelimitedLists({ lists: campaign.lists }),
            [t('exclusion_lists')]: DelimitedLists({ lists: campaign.exclusion_lists }),
        }} />
        <InfoTable rows={{
            ...variants.length ? { [t('variants')]: variantList } : {},
            [t('translations')]: locales.map(l => l.label).join(', '),
        }} />
        <Button variant="primary" type="submit" onClick={onSubmit}>{t(campaign.send_at ? 'reschedule' : 'launch')}</Button>
    </>
}

interface LaunchFormProps {
    onSubmit: (data: CampaignLaunchParams) => Promise<void>
}

function LaunchForm({ onSubmit }: LaunchFormProps) {
    const { t } = useTranslation()
    const renderForm = ({ form }: { form: UseFormReturn<CampaignLaunchParams> }) => {
        const launchType = useWatch({
            control: form.control,
            name: 'launch_type',
        })
        return <>
            <RadioInput.Field
                form={form}
                name="launch_type"
                label={t('launch_period')}
                options={[{ key: 'now', label: t('now') }, { key: 'later', label: t('schedule') }]}
            />
            {launchType === 'later' && <>
                <DateTimeField
                    control={form.control}
                    name="send_at"
                    label={t('send_at')}
                    required />
                <SwitchField
                    form={form}
                    name="send_in_user_timezone"
                    label={t('send_in_user_timezone')}
                    subtitle={t('send_in_user_timezone_desc')} />
            </>}
        </>
    }

    return <>
        <p>{t('launch_subtitle')}</p>
        <FormWrapper<CampaignLaunchParams>
            submitLabel={t('continue')}
            onSubmit={onSubmit}>
            {form => renderForm({ form })}
        </FormWrapper>
    </>
}

export default function LaunchCampaign({ open, onClose }: LaunchCampaignParams) {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [campaign, setCampaign] = useContext(CampaignContext)
    const [error, setError] = useState<string | undefined>()
    const [launchParams, setLaunchParams] = useState<CampaignLaunchParams | undefined>()

    async function handleLaunchCampaign() {
        if (!launchParams) return
        const { send_at, send_in_user_timezone, launch_type } = launchParams
        const sendAt = send_at ? Date.parse(send_at) : new Date()
        if (launch_type === 'later'
            && isPast(sendAt)
            && !confirm('Are you sure you want to launch a campaign in the past? Messages will go out immediately.')) {
            return
        }
        const params: CampaignLaunchParams = {
            send_at: formatISO(sendAt),
            state: 'scheduled',
            send_in_user_timezone,
        }

        try {
            const value = await api.campaigns.update(project.id, campaign.id, params)
            setCampaign(value)
            onClose(false)
            await navigate('delivery')
        } catch (error: any) {
            if (error?.response?.data) {
                setError(error?.response?.data?.error)
            }
        }
    }

    const handleCancel = () => {
        onClose(false)
        setLaunchParams(undefined)
    }

    return <Modal
        title={t('launch_campaign')}
        open={open}
        onClose={handleCancel}
        size={launchParams ? 'regular' : 'small'}
    >
        {error && <Alert variant="error" title="Error">{error}</Alert>}
        {launchParams
            ? <LaunchConfirmation
                campaign={campaign}
                onSubmit={async () => await handleLaunchCampaign()}
            />
            : <LaunchForm onSubmit={async (params) => setLaunchParams(params)} />}
    </Modal>
}
