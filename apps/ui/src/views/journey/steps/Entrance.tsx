import { JourneyStepType, Rule } from '../../../types'
import { EntranceStepIcon } from '../../../ui/icons'
import OptionField from '../../../ui/form/OptionField'
import TextInput from '../../../ui/form/TextInput'
import RuleBuilder, { ruleDescription } from '../../users/RuleBuilder'
import { useContext } from 'react'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import SwitchField from '../../../ui/form/SwitchField'

interface EntranceConfig {
    trigger: 'none' | 'event' | 'schedule'
    eventName?: string
    rule?: Rule
    multiple?: boolean
    // list_id?: number
    // schedule?: string
    concurrent?: boolean
}

const triggerOptions = [
    {
        key: 'none',
        label: 'None',
    },
    {
        key: 'event',
        label: 'Event',
    },
]

const wrapper: Rule = {
    type: 'wrapper',
    group: 'event',
    path: '$.name',
    operator: 'and',
    children: [],
}

export const entranceStep: JourneyStepType<EntranceConfig> = {
    name: 'Entrance',
    icon: <EntranceStepIcon />,
    category: 'entrance',
    description: 'How users are added to this journey.',
    newData: async () => ({
        trigger: 'none',
        max: 1,
        concurrent: false,
    }),
    Describe({ value }) {
        const [preferences] = useContext(PreferencesContext)

        if (value.trigger === 'event') {
            return (
                <>
                    Enter on event: <strong>{value.eventName ?? ''}</strong>
                    {
                        !!value.rule?.children?.length && (
                            <>
                                {ruleDescription(preferences, value.rule)}
                            </>
                        )
                    }
                </>
            )
        }

        return (
            <>
                {'No automated trigger'}
            </>
        )
    },
    Edit({ onChange, value }) {
        return (
            <>
                <OptionField
                    name="trigger"
                    label="Trigger"
                    value={value.trigger}
                    options={triggerOptions}
                    onChange={trigger => onChange({ ...value, trigger })}
                    required
                />
                {
                    value.trigger === 'event' && (
                        <>
                            <TextInput
                                name="eventName"
                                label="Event Name"
                                required
                                value={value.eventName ?? ''}
                                onChange={eventName => onChange({ ...value, eventName })}
                            />
                            {
                                value.eventName && (
                                    <RuleBuilder
                                        rule={value.rule ?? wrapper}
                                        setRule={rule => onChange({ ...value, rule })}
                                        eventName={value.eventName}
                                        headerPrefix="Matching"
                                    />
                                )
                            }
                            <SwitchField
                                name="multiple"
                                label="Multiple Entries"
                                subtitle="Should people enter this journey multiple times?"
                                checked={Boolean(value.multiple)}
                                onChange={multiple => onChange({ ...value, multiple })}
                            />
                        </>
                    )
                }
                {
                    (value.trigger !== 'event' || value.multiple) && (
                        <SwitchField
                            name="concurrent"
                            label="Simultaneous Entries"
                            subtitle="If enabled, user could join this journey multiple times before finishing previous ones."
                            checked={Boolean(value.concurrent)}
                            onChange={concurrent => onChange({ ...value, concurrent })}
                        />
                    )
                }
            </>
        )
    },
    hasDataKey: true,
}
