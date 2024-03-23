import { JourneyStepType } from '../../../types'
import SourceEditor from '../../../ui/SourceEditor'
import { EventStepIcon } from '../../../ui/icons'
import { JsonPreview } from '../../../ui'
import TextInput from '../../../ui/form/TextInput'
import { useTranslation } from 'react-i18next'

interface EventConfig {
    event_name: string
    template: string // handlebars template for json object
}

export const eventStep: JourneyStepType<EventConfig> = {
    name: 'trigger_event',
    icon: <EventStepIcon />,
    category: 'action',
    description: 'trigger_event_desc',
    Describe({ value }) {
        const { t } = useTranslation()
        if (value?.template) {
            try {
                const parsed = JSON.parse(value.template)
                return (
                    <JsonPreview value={parsed} />
                )
            } catch {
                return <>{t('trigger_event_empty')}</>
            }
        }
        return null
    },
    newData: async () => ({
        template: '{\n\n}\n',
        event_name: 'Journey Triggered',
    }),
    Edit: ({ onChange, value }) => {
        const { t } = useTranslation()
        return (
            <div style={{ maxWidth: 400 }}>
                <TextInput
                    name="event_name"
                    label={t('event_name')}
                    value={value.event_name}
                    onChange={event_name => onChange({ ...value, event_name })}
                />
                <p>
                    {t('trigger_event_desc1')}
                    {t('trigger_event_desc2')}<code>{'user'}</code>
                    {t('trigger_event_desc3')}<code>{'journey[data_key]'}</code>{'.'}
                </p>
                <SourceEditor
                    onChange={(template = '') => onChange({ ...value, template })}
                    value={value.template ?? ''}
                    height={500}
                    width="400px"
                    language="handlebars"
                />
            </div>
        )
    },
}
