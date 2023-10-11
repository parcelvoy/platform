import { JourneyStepType } from '../../../types'
import SourceEditor from '@monaco-editor/react'
import { useContext } from 'react'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import { UpdateStepIcon } from '../../../ui/icons'
import { JsonPreview } from '../../../ui'

interface UpdateConfig {
    template: string // handlebars template for json object
}

export const updateStep: JourneyStepType<UpdateConfig> = {
    name: 'User Update',
    icon: <UpdateStepIcon />,
    category: 'action',
    description: 'Make updates to a user\'s profile.',
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
                        {'(click to see updated fields)'}
                    </>
                )
            }
        }
        return null
    },
    newData: async () => ({
        template: '{\n\n}\n',
    }),
    Edit: ({ onChange, value }) => {
        const [{ mode }] = useContext(PreferencesContext)
        return (
            <>
                <p style={{ maxWidth: 400 }}>
                    {'Write a Handlebars template that renders JSON that will be shallow merged into the user\'s profile data.'}
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
            </>
        )
    },
}
