import { formatISO, isPast } from 'date-fns'
import { useContext, useState } from 'react'
import api from '../../api'
import { CampaignContext, ProjectContext } from '../../contexts'
import { CampaignLaunchParams } from '../../types'
import RadioInput from '../../ui/form/RadioInput'
import SwitchField from '../../ui/form/SwitchField'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import Alert from '../../ui/Alert'
import { zonedTimeToUtc } from 'date-fns-tz'
import { Column, Columns } from '../../ui/Columns'
import { useController } from 'react-hook-form'
import { SelectionProps } from '../../ui/form/Field'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface DateTimeFieldProps extends SelectionProps<CampaignLaunchParams> {
    label: string
    required?: boolean
}

function DateTimeField({ name, control, required }: DateTimeFieldProps) {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')

    const { field: { onChange } } = useController({
        control,
        name,
        rules: {
            required,
        },
    })

    const handleOnChange = () => {
        if (!date || !time) return
        const localDate = new Date(`${date}T${time}`)
        const utcDate = zonedTimeToUtc(localDate, project.timezone)
        onChange(utcDate.toISOString())
    }

    const handleSetDate = (value: string) => {
        setDate(value)
        handleOnChange()
    }

    const handleSetTime = (value: string) => {
        setTime(value)
        handleOnChange()
    }

    return <div className="date-time">
        <Columns>
            <Column>
                <TextInput<string>
                    type="date"
                    name="date"
                    label={t('send_at_date')}
                    onChange={handleSetDate}
                    onBlur={handleOnChange}
                    value={date}
                    required={required} />
            </Column>
            <Column>
                <TextInput<string>
                    type="time"
                    name="time"
                    label={t('send_at_time')}
                    onChange={handleSetTime}
                    onBlur={handleOnChange}
                    value={time}
                    required={required} />
            </Column>
        </Columns>
        <span className="label-subtitle">
            {t('send_at_timezone_notice')}
        </span>
    </div>
}

interface LaunchCampaignParams {
    open: boolean
    onClose: (open: boolean) => void
}

export default function LaunchCampaign({ open, onClose }: LaunchCampaignParams) {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [campaign, setCampaign] = useContext(CampaignContext)
    const [launchType, setLaunchType] = useState('now')
    const [error, setError] = useState<string | undefined>()

    async function handleLaunchCampaign(params: CampaignLaunchParams) {
        const sendAt = params.send_at ? Date.parse(params.send_at) : new Date()
        if (launchType === 'later'
            && isPast(sendAt)
            && !confirm('Are you sure you want to launch a campaign in the past? Messages will go out immediately.')) {
            return
        }
        params.send_at = formatISO(sendAt)
        params.state = 'scheduled'

        try {
            const value = await api.campaigns.update(project.id, campaign.id, params)
            setCampaign(value)
            onClose(false)
            navigate('delivery')
        } catch (error: any) {
            if (error?.response?.data) {
                setError(error?.response?.data?.error)
            }
        }
    }

    return <Modal title={t('launch_campaign')} open={open} onClose={onClose}>
        {error && <Alert variant="error" title="Error">{error}</Alert>}
        <p>{t('launch_subtitle')}</p>
        <FormWrapper<CampaignLaunchParams>
            submitLabel={t(campaign.send_at ? 'reschedule' : 'launch')}
            onSubmit={handleLaunchCampaign}>
            {form => <>
                <RadioInput
                    label={t('launch_period')}
                    options={[{ key: 'now', label: t('now') }, { key: 'later', label: t('schedule') }]}
                    value={launchType}
                    onChange={setLaunchType} />
                {launchType === 'later' && <>
                    <DateTimeField
                        control={form.control}
                        name="send_at"
                        label={t('Send At')}
                        required />
                    <SwitchField
                        form={form}
                        name="send_in_user_timezone"
                        label={t('send_in_user_timezone')}
                        subtitle={t('send_in_user_timezone_desc')} />
                </>}
            </>}
        </FormWrapper>
    </Modal>
}
