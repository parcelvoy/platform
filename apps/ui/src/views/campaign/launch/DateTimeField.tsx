import { useContext, useState } from 'react'
import { CampaignLaunchParams } from '../../../types'
import { SelectionProps } from '../../../ui/form/Field'
import { useTranslation } from 'react-i18next'
import { useController } from 'react-hook-form'
import { zonedTimeToUtc } from 'date-fns-tz'
import { ProjectContext } from '../../../contexts'
import { Column, Columns } from '../../../ui'
import TextInput from '../../../ui/form/TextInput'

interface DateTimeFieldProps extends SelectionProps<CampaignLaunchParams> {
    label: string
    required?: boolean
}

export default function DateTimeField({ name, control, required }: DateTimeFieldProps) {
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
