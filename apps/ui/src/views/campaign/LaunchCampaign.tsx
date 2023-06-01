import { formatISO, isPast } from 'date-fns'
import { useContext, useState } from 'react'
import api from '../../api'
import { CampaignContext, ProjectContext } from '../../contexts'
import { CampaignLaunchParams } from '../../types'
import OptionField from '../../ui/form/OptionField'
import SwitchField from '../../ui/form/SwitchField'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import Alert from '../../ui/Alert'
import { zonedTimeToUtc } from 'date-fns-tz'
import { Column, Columns } from '../../ui/Columns'
import { useController } from 'react-hook-form'
import { SelectionProps } from '../../ui/form/Field'

interface DateTimeFieldProps extends SelectionProps<CampaignLaunchParams> {
    label: string
    required?: boolean
}

function DateTimeField({ label, name, control, required }: DateTimeFieldProps) {
    const [project] = useContext(ProjectContext)
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
                    label={`${label} Date`}
                    onChange={handleSetDate}
                    onBlur={handleOnChange}
                    value={date}
                    required={required} />
            </Column>
            <Column>
                <TextInput<string>
                    type="time"
                    name="time"
                    label={`${label} Time`}
                    onChange={handleSetTime}
                    onBlur={handleOnChange}
                    value={time}
                    required={required} />
            </Column>
        </Columns>
        <span className="label-subtitle">
            {"The selected date and time will be in the project's timezone not your own."}
        </span>
    </div>
}

interface LaunchCampaignParams {
    open: boolean
    onClose: (open: boolean) => void
}

export default function LaunchCampaign({ open, onClose }: LaunchCampaignParams) {
    const [project] = useContext(ProjectContext)
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

        try {
            const value = await api.campaigns.update(project.id, campaign.id, params)
            setCampaign(value)
            onClose(false)
        } catch (error: any) {
            if (error?.response?.data) {
                setError(error?.response?.data?.error)
            }
        }
    }

    return <Modal title="Launch Campaign" open={open} onClose={onClose}>
        {error && <Alert variant="error" title="Error">{error}</Alert>}
        <p>Please check to ensure all settings are correct before launching a campaign. A scheduled campaign can be aborted, but one sent immediately cannot.</p>
        <FormWrapper<CampaignLaunchParams>
            submitLabel="Launch"
            onSubmit={handleLaunchCampaign}>
            {form => <>
                <OptionField name="when"
                    label="Launch Period"
                    options={[{ key: 'now', label: 'Now' }, { key: 'later', label: 'Schedule' }]}
                    value={launchType}
                    onChange={setLaunchType} />
                {launchType === 'later' && <>
                    <DateTimeField
                        control={form.control}
                        name="send_at"
                        label="Send At"
                        required />
                    <SwitchField
                        form={form}
                        name="send_in_user_timezone"
                        label="Send In Users Timezone"
                        subtitle="Should the campaign go out at the selected time in the users timezone or in the projects timezone?" />
                </>}
            </>}
        </FormWrapper>
    </Modal>
}
