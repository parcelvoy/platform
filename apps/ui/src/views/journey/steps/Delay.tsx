import { useContext } from 'react'
import { JourneyStepType } from '../../../types'
import RadioInput from '../../../ui/form/RadioInput'
import TextInput from '../../../ui/form/TextInput'
import { DelayStepIcon } from '../../../ui/icons'
import { formatDate, formatDuration, snakeToTitle } from '../../../utils'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import { parse, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface DelayStepConfig {
    format: 'duration' | 'time' | 'date'
    minutes: number
    hours: number
    days: number
    time?: string
    date?: string
}

export const delayStep: JourneyStepType<DelayStepConfig> = {
    name: 'delay',
    icon: <DelayStepIcon />,
    category: 'delay',
    description: 'delay_desc',
    Describe({ value }) {
        const { t } = useTranslation()
        const [preferences] = useContext(PreferencesContext)
        if (value.format === 'duration') {
            return (
                <>
                    {t('wait') + ' '}
                    <strong>
                        {formatDuration(preferences, {
                            days: value.days ?? 0,
                            hours: value.hours ?? 0,
                            minutes: value.minutes ?? 0,
                        }) || <>&#8211;</>}
                    </strong>
                </>
            )
        }
        if (value.format === 'time') {
            const parsed = parse(value.time ?? '', 'HH:mm', new Date())
            return (
                <>
                    {t('wait_until') + ' '}
                    <strong>
                        {isNaN(parsed.getTime()) ? '--:--' : formatDate(preferences, parsed, 'p')}
                    </strong>
                </>
            )
        }
        if (value.format === 'date') {
            const parsed = parseISO(value.date ?? '')
            return (
                <>
                    {t('wait_until') + ' '}
                    <strong>
                        {isNaN(parsed.getTime())
                            ? value.date?.includes('{{')
                                ? <><br />{value.date}</>
                                : <>&#8211;</>
                            : formatDate(preferences, parsed, 'PP')}
                    </strong>
                </>
            )
        }
        return null
    },
    newData: async () => ({
        minutes: 0,
        hours: 0,
        days: 0,
        format: 'duration',
    }),
    Edit({
        onChange,
        value,
    }) {
        const { t } = useTranslation()
        return (
            <>
                <RadioInput label={t('type')} options={[
                    { key: 'duration', label: t('for_duration') },
                    { key: 'time', label: t('until_time') },
                    { key: 'date', label: t('until_date') },
                ]}
                value={value.format}
                onChange={format => onChange({ ...value, format }) } />
                { value.format === 'duration'
                    && ['days', 'hours', 'minutes'].map(name => (
                        <TextInput
                            key={name}
                            name={name}
                            label={snakeToTitle(name)}
                            type="number"
                            min={0}
                            value={value[name as keyof DelayStepConfig] ?? 0}
                            onChange={n => onChange({ ...value, [name]: n })}
                        />
                    ))
                }
                { value.format === 'time'
                    && <TextInput
                        name="time"
                        label={t('time')}
                        type="time"
                        subtitle={t('delay_time_desc')}
                        value={value.time ?? ''}
                        onChange={time => onChange({ ...value, time })}
                    />
                }
                { value.format === 'date'
                    && <TextInput
                        name="date"
                        label={t('date')}
                        type="text"
                        subtitle={t('delay_date_desc')}
                        placeholder="YYYY-MM-DD"
                        value={value.date ?? ''}
                        onChange={date => onChange({ ...value, date })}
                    />
                }
            </>
        )
    },
}
