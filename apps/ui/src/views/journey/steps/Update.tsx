import { JourneyStepType } from '../../../types'
import SourceEditor from '@monaco-editor/react'
import { useContext, useState } from 'react'
import { PreferencesContext } from '../../../ui/PreferencesContext'
import { UpdateStepIcon } from '../../../ui/icons'
import Modal from '../../../ui/Modal'
import Button from '../../../ui/Button'

interface UpdateConfig {
    template: string // handlebars template for json object
}

export const updateStep: JourneyStepType<UpdateConfig> = {
    name: 'User Update',
    icon: <UpdateStepIcon />,
    category: 'action',
    description: 'Make updates to a user\'s profile.',
    newData: async () => ({
        template: '{\n\n}\n',
    }),
    Edit: ({ onChange, value }) => {
        const [{ mode }] = useContext(PreferencesContext)
        const [open, setOpen] = useState(false)
        return (
            <>
                <Button
                    variant="secondary"
                    onClick={() => setOpen(true)}
                    style={{
                        width: '100%',
                    }}
                >
                    <code
                        style={{
                            whiteSpace: 'pre',
                            fontSize: 12,
                            textAlign: 'left',
                            minHeight: 20,
                            maxHeight: 90,
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                        {value?.template ?? ''}
                        <div
                            style={{
                                background: 'linear-gradient(to top, var(--color-background), transparent)',
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 30,
                            }}
                        />
                    </code>
                </Button>
                <Modal
                    size="large"
                    open={open}
                    onClose={setOpen}
                    title="User Update Template"
                    description="Write a handlebars template to construct a JSON object that will be shallow-merged into the user's profile data when this step is triggered."
                >
                    <SourceEditor
                        onChange={(template = '') => onChange({ ...value, template })}
                        value={value.template ?? ''}
                        height={500}
                        width="100%"
                        theme={mode === 'dark' ? 'vs-dark' : undefined}
                        language="json"
                    />
                </Modal>
            </>
        )
    },
}
