import { JourneyStepType } from '../../../types'
import SourceEditor from '@monaco-editor/react'
import { useContext } from 'react'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import { EventStepIcon } from '../../../ui/icons'
import { JsonPreview } from '../../../ui'
import TextInput from '../../../ui/form/TextInput'

interface EventConfig {
    event_name: string
    template: string // handlebars template for json object
}

export const eventStep: JourneyStepType<EventConfig> = {
    name: 'Trigger Event',
    icon: <EventStepIcon />,
    category: 'action',
    description: 'Trigger an analytic event for the user.',
    Describe({ value }) {
        if (value?.template) {
            try {
                const parsed = JSON.parse(value.template)
                return (
                    <JsonPreview value={parsed} />
                )
            } catch {
                return (
                    <>
                        {'(click to see event fields)'}
                    </>
                )
            }
        }
        return null
    },
    newData: async () => ({
        template: '{\n\n}\n',
        event_name: 'Journey Triggered',
    }),
    Edit: ({ onChange, value }) => {
        const [{ mode }] = useContext(PreferencesContext)
        return (
            <div style={{ maxWidth: 400 }}>
                <TextInput
                    name="event_name"
                    label="Event Name"
                    value={value.event_name}
                    onChange={event_name => onChange({ ...value, event_name })}
                />
                <p>
                    {'Write a Handlebars template that renders JSON that will be sent as fields on the event.'}
                    {' The user\'s current profile data is available in the '}<code>{'user'}</code>
                    {' variable, and data collected at other steps are available in '}<code>{'journey[data_key]'}</code>{'.'}
                </p>
                <SourceEditor
                    onChange={(template = '') => onChange({ ...value, template })}
                    value={value.template ?? ''}
                    height={500}
                    width="400px"
                    theme={mode === 'dark' ? 'vs-dark' : undefined}
                    language="handlebars"
                />
            </div>
        )
    },
}
