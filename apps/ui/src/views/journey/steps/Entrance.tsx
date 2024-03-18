import { JourneyStepType, Rule } from '../../../types'
import { EntranceStepIcon } from '../../../ui/icons'
import RadioInput from '../../../ui/form/RadioInput'
import TextInput from '../../../ui/form/TextInput'
import RuleBuilder, { ruleDescription } from '../../users/RuleBuilder'
import { useCallback, useContext } from 'react'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import SwitchField from '../../../ui/form/SwitchField'
import { createUuid } from '../../../utils'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import api from '../../../api'
import { RRule } from 'rrule'
import { useResolver } from '../../../hooks'
import RRuleEditor from '../../../ui/RRuleEditor'
import CodeExample from '../../../ui/CodeExample'
import { env } from '../../../config/env'

interface EntranceConfig {
    trigger: 'none' | 'event' | 'schedule'

    // event based
    event_name?: string
    rule?: Rule
    multiple?: boolean
    concurrent?: boolean

    // schedule based
    list_id?: number
    schedule?: string
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
    {
        key: 'schedule',
        label: 'Schedule',
    },
]

const wrapper: Rule = {
    uuid: createUuid(),
    type: 'wrapper',
    group: 'event',
    path: '$.name',
    operator: 'and',
    children: [],
}

const codeExample = (journeyId: number, entranceId: number) => `curl --request POST \\
--url '${env.api.baseURL}/client/journeys/${journeyId}/trigger' \\
--header 'Authorization: Bearer API_KEY' \\
--header 'Content-Type: application/json' \\
--data '{
    "entrance_id": ${entranceId},
    "user": {
        "external_id": "example-user-id",
        "extra_user_property": true
    },
    "event": {
        "purchase_amount": 29.99
    }
}'`

export const entranceStep: JourneyStepType<EntranceConfig> = {
    name: 'Entrance',
    icon: <EntranceStepIcon />,
    category: 'entrance',
    description: 'How users are added to this journey.',
    newData: async () => ({
        trigger: 'none',
    }),
    Describe({
        project: {
            id: projectId,
        },
        value: {
            trigger,
            event_name,
            rule,
            list_id,
            schedule,
        },
    }) {
        const [preferences] = useContext(PreferencesContext)

        const [list] = useResolver(useCallback(async () => {
            if (trigger === 'schedule' && list_id) {
                return await api.lists.get(projectId, list_id)
            }
            return null
        }, [projectId, list_id, trigger]))

        if (trigger === 'schedule') {
            let s = ''
            if (schedule) {
                try {
                    s = RRule.fromString(schedule).toText()
                } catch {}
            }
            return (
                <div style={{ maxWidth: 300 }}>
                    {'Add everyone from '}
                    <strong>
                        {list?.name ?? '--'}
                    </strong>
                    {' '}
                    {s}
                </div>
            )
        }

        if (trigger === 'event') {
            return (
                <div style={{ maxWidth: 300 }}>
                    {'Add anyone when '}
                    <strong>{event_name ?? ''}</strong>
                    {' occurs'}
                    {
                        !!rule?.children?.length && (
                            <>
                                {ruleDescription(preferences, rule)}
                            </>
                        )
                    }
                </div>
            )
        }

        return (
            <>
                {'No automated trigger'}
            </>
        )
    },
    Edit({ onChange, project: { id: projectId }, journey: { id: journeyId }, stepId, value }) {

        const getList = useCallback(async (id: number) => await api.lists.get(projectId, id), [projectId])
        const searchLists = useCallback(async (q: string) => await api.lists.search(projectId, { q, limit: 50 }), [projectId])

        return (
            <>
                <RadioInput
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
                                name="event_name"
                                label="Event Name"
                                required
                                value={value.event_name ?? ''}
                                onChange={event_name => onChange({ ...value, event_name })}
                            />
                            {
                                value.event_name && (
                                    <RuleBuilder
                                        rule={value.rule ?? wrapper}
                                        setRule={rule => onChange({ ...value, rule })}
                                        eventName={value.event_name}
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
                            {
                                value.multiple && (
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
                }
                {
                    value.trigger === 'schedule' && (
                        <>
                            <EntityIdPicker
                                get={getList}
                                search={searchLists}
                                value={value.list_id ?? 0}
                                onChange={list_id => onChange({ ...value, list_id })}
                                label="List"
                                subtitle="All users from this list will start this journey on the configured schedule."
                                required
                            />
                            <RRuleEditor
                                label="Schedule"
                                value={value.schedule ?? ''}
                                onChange={schedule => onChange({ ...value, schedule })}
                            />
                        </>
                    )
                }
                {
                    !!stepId && (
                        <div style={{ maxWidth: 600 }}>
                            <CodeExample
                                title="Trigger Entrance"
                                description={
                                    <>
                                        This entrance can be triggered directly via API.
                                        An example request is available below.
                                        Data from the <code>event</code> field will
                                        be available for use in the journey and campaign
                                        templates under <code>journey.DATA_KEY_OF_THIS_STEP.*</code>
                                        {'(for example, '}<code>journey.my_entrance.purchaseAmount</code>{')'}.
                                    </>
                                }
                                code={codeExample(journeyId, stepId)}
                            />
                        </div>
                    )
                }
            </>
        )
    },
    hasDataKey: true,
}
