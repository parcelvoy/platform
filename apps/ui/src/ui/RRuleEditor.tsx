import { ReactNode, useMemo } from 'react'
import { ControlledProps } from '../types'
import { Frequency, Options, RRule, Weekday } from 'rrule'
import TextInput from './form/TextInput'
import RadioInput from './form/RadioInput'
import { format } from 'date-fns'
import { FieldOption } from './form/Field'
import { MultiOptionField } from './form/MultiOptionField'
import Heading from './Heading'

const frequencyOptions: FieldOption[] = [
    {
        key: 'once',
        label: 'Once',
    },
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

interface RRuleEditorProps extends ControlledProps<[string, Partial<Options> | undefined]> {
    label?: ReactNode
}

type RuleFrequency = 'once' | Frequency
type RuleOptions = Omit<Options, 'freq'> & { freq: RuleFrequency }

export default function RRuleEditor({ label, onChange, value }: RRuleEditorProps) {
    const options = useMemo<Partial<RuleOptions>>(() => {
        const rule = value[0]
        if (rule) {
            try {
                const options = RRule.fromString(rule).origOptions as RuleOptions
                if (options.freq === undefined) {
                    options.freq = 'once'
                }
                return options
            } catch {}
        }
        return {
            freq: 'once',
        } satisfies Partial<RuleOptions>
    }, [value])

    const setValues = ({ freq, ...options }: Partial<RuleOptions>) => {
        const rule: Partial<Options> = {
            ...options,
            freq: freq === 'once' ? undefined : freq,
        }
        onChange([RRule.optionsToString(rule), rule])
    }

    return (
        <fieldset style={{ border: 0, padding: 0 }}>
            <legend>
                <Heading size="h4" title={label} />
            </legend>
            <RadioInput
                label="Frequency"
                required
                value={options.freq as RuleFrequency}
                options={frequencyOptions}
                onChange={(freq: RuleFrequency) => setValues({ ...options, freq })}
            />
            <TextInput
                name="startDate"
                label={options.freq !== 'once' ? 'Start Date' : 'On Date'}
                type="date"
                required
                value={options.dtstart ? format(options.dtstart, 'yyyy-MM-dd') : ''}
                onChange={dtstart => setValues({ ...options, dtstart: dtstart ? new Date(dtstart) : null })}
            />
            { options.freq !== 'once' && (
                <>
                    <TextInput
                        name="endDate"
                        label="End Date"
                        type="date"
                        value={options.until ? format(options.until, 'yyyy-MM-dd') : undefined}
                        onChange={endDate => setValues({ ...options, until: endDate ? new Date(endDate) : null })}
                    />
                    <TextInput
                        name="interval"
                        label="Interval"
                        type="number"
                        min={1}
                        required
                        value={options.interval ?? 1}
                        onChange={interval => setValues({ ...options, interval })}
                    />
                    {
                        options.freq === Frequency.DAILY && (
                            <MultiOptionField
                                options={dayOptions}
                                value={(Array.isArray(options.byweekday) ? options.byweekday : options.byweekday ? [options.byweekday] : []).map(w => {
                                    if (w instanceof Weekday) {
                                        return w.toString()
                                    }
                                    return w
                                })}
                                onChange={byweekday => {
                                    setValues({ ...options, byweekday: byweekday.map(n => Weekday.fromStr(n)) })
                                }}
                                label="Days"
                            />
                        )
                    }
                </>
            )}
        </fieldset>
    )
}
