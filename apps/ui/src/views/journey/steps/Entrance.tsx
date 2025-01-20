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
import { useTranslation, Trans } from 'react-i18next'

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
    name: 'entrance',
    icon: <EntranceStepIcon />,
    category: 'entrance',
    description: 'entrance_desc',
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
        const { t } = useTranslation()
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
                    const rule = RRule.fromString(schedule)
                    if (rule.options.freq) {
                        s = rule.toText()
                        if (rule.options.freq === RRule.DAILY) {
                            s += Number(rule.options.byhour) < 12
                                ? 'am'
                                : 'pm'
                        }
                    } else {
                        s = 'once'
                    }
                } catch {}
            }
            return (
                <div style={{ maxWidth: 300 }}>
                    {t('entrance_add_everyone_from') + ' '}
                    <strong>
                        {list?.name ?? <>&#8211;</>}
                    </strong>
                    {' '}
                    {s}
                </div>
            )
        }

        if (trigger === 'event') {
            return (
                <div style={{ maxWidth: 300 }}>
                    {t('entrance_add_everyone_when') + ' '}
                    <strong>{event_name ?? ''}</strong>
                    {t('entrance_occurs')}
                    {
                        !!rule?.children?.length && (
                            <>
                                {' '}
                                {ruleDescription(preferences, rule)}
                            </>
                        )
                    }
                </div>
            )
        }

        return <>{t('entrance_empty')}</>
    },
    Edit({ onChange, project: { id: projectId }, journey: { id: journeyId }, stepId, value }) {

        const { t } = useTranslation()
        const getList = useCallback(async (id: number) => await api.lists.get(projectId, id), [projectId])
        const searchLists = useCallback(async (q: string) => await api.lists.search(projectId, { q, limit: 50 }), [projectId])

        return (
            <>
                <RadioInput
                    label={t('trigger')}
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
                                label={t('event_name')}
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
                                        headerPrefix={t('entrance_matching')}
                                    />
                                )
                            }
                            <SwitchField
                                name="multiple"
                                label={t('entrance_multiple_entries')}
                                subtitle={t('entrance_multiple_entries_desc')}
                                checked={Boolean(value.multiple)}
                                onChange={multiple => onChange({ ...value, multiple })}
                            />
                            {
                                value.multiple && (
                                    <SwitchField
                                        name="concurrent"
                                        label={t('entrance_simultaneous_entries')}
                                        subtitle={t('entrance_simultaneous_entries_desc')}
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
                                label={t('list')}
                                subtitle={t('entrance_list_desc')}
                                required
                            />
                            <RRuleEditor
                                label={t('schedule')}
                                value={[value.schedule ?? '', undefined]}
                                onChange={([schedule, rule]) => onChange({ ...value, schedule, multiple: !!rule?.freq })}
                            />
                        </>
                    )
                }
                {
                    !!stepId && value.trigger === 'none' && (
                        <div style={{ maxWidth: 600 }}>
                            <CodeExample
                                title={t('entrance_trigger')}
                                description={
                                    <Trans i18nKey="entrance_trigger_desc">
                                        This entrance can be triggered directly via API. An example request is available below. Data from the <code>event</code> field will be available for use in the journey and campaign templates under <code>journey.DATA_KEY_OF_THIS_STEP.*</code> (for example, <code>journey.my_entrance.purchaseAmount</code>).
                                    </Trans>
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
