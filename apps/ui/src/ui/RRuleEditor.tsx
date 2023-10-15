import { ReactNode, useMemo } from 'react'
import { ControlledProps } from '../types'
import { Frequency, Options, RRule, Weekday } from 'rrule'
import TextInput from './form/TextInput'
import OptionField from './form/OptionField'
import { format, parseISO } from 'date-fns'
import { FieldOption } from './form/Field'
import { ToggleButtonGroupInput } from './form/ToggleButtonGroupInput'

const frequencyOptions: FieldOption[] = [
    {
        key: Frequency.DAILY,
        label: 'Daily',
    },
    {
        key: Frequency.MONTHLY,
        label: 'Monthly',
    },
]

const dayOptions: FieldOption[] = [
    {
        key: 'MO',
        label: 'Mon',
    },
    {
        key: 'TU',
        label: 'Tue',
    },
    {
        key: 'WE',
        label: 'Wed',
    },
    {
        key: 'TH',
        label: 'Thu',
    },
    {
        key: 'FR',
        label: 'Fri',
    },
    {
        key: 'SA',
        label: 'Sat',
    },
    {
        key: 'SU',
        label: 'Sun',
    },
]

interface RRuleEditorProps extends ControlledProps<string> {
    label?: ReactNode
}

export default function RRuleEditor({ label, onChange, value }: RRuleEditorProps) {

    const options = useMemo<Partial<Options>>(() => {
        if (value) {
            try {
                return RRule.fromString(value).origOptions
            } catch {}
        }
        return {} satisfies Partial<Options>
    }, [value])

    return (
        <fieldset style={{ border: 0, padding: 0 }}>
            <legend>{label}</legend>
            <OptionField
                name="freq"
                label="Frequency"
                required
                value={options.freq}
                options={frequencyOptions}
                onChange={freq => onChange(RRule.optionsToString({ ...options, freq }))}
            />
            <TextInput
                name="startDate"
                label="Start Date"
                type="date"
                required
                value={options.dtstart ? format(options.dtstart, 'yyyy-MM-dd') : ''}
                onChange={date => {
                    if (date) {
                        const time = options.dtstart ? format(options.dtstart, 'HH:mm:ss') : '00:00:00'
                        const dtstart = parseISO(date + 'T' + time)
                        if (!isNaN(dtstart.getTime())) {
                            onChange(RRule.optionsToString({ ...options, dtstart }))
                        }
                    }
                }}
            />
            {
                options.dtstart && (
                    <TextInput
                        name="startTime"
                        label="Start Time"
                        type="time"
                        required
                        value={options.dtstart && format(options.dtstart, 'HH:mm')}
                        onChange={time => {
                            if (time) {
                                const date = format(options.dtstart!, 'yyyy-MM-hh')
                                const dtstart = parseISO(date + 'T' + time + ':00')
                                if (!isNaN(dtstart.getTime())) {
                                    onChange(RRule.optionsToString({ ...options, dtstart }))
                                }
                            }
                        }}
                    />
                )
            }
            <TextInput
                name="endDate"
                label="End Date"
                type="date"
                value={options.until ? format(options.until, 'yyyy-MM-dd') : undefined}
                onChange={endDate => onChange(RRule.optionsToString({ ...options, until: endDate ? new Date(endDate) : null }))}
            />
            <TextInput
                name="interval"
                label="Interval"
                type="number"
                min={1}
                required
                value={options.interval ?? 1}
                onChange={interval => onChange(RRule.optionsToString({ ...options, interval }))}
            />
            {
                options.freq === Frequency.DAILY && (
                    <ToggleButtonGroupInput
                        options={dayOptions}
                        value={(Array.isArray(options.byweekday) ? options.byweekday : options.byweekday ? [options.byweekday] : []).map(w => {
                            if (w instanceof Weekday) {
                                return w.toString()
                            }
                            return w
                        })}
                        onChange={byweekday => {
                            onChange(RRule.optionsToString({ ...options, byweekday: byweekday.map(n => Weekday.fromStr(n)) }))
                        }}
                        label="Days"
                    />
                )
            }
        </fieldset>
    )
}
