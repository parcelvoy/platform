import { useContext } from 'react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Journey } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'
import SwitchField from '../../ui/form/SwitchField'

interface JourneyFormProps {
    journey?: Journey
    onSaved?: (journey: Journey) => void
}

export function JourneyForm({ journey, onSaved }: JourneyFormProps) {
    const [project] = useContext(ProjectContext)
    return (
        <FormWrapper<Journey>
            onSubmit={async ({ id, name, description, published = false, tags }) => {
                const saved = id
                    ? await api.journeys.update(project.id, id, { name, description, published, tags })
                    : await api.journeys.create(project.id, { name, description, published, tags })
                toast.success('Saved')
                onSaved?.(saved)
            }}
            defaultValues={journey}
        >
            {
                form => (
                    <>
                        <TextInput.Field
                            form={form}
                            name="name"
                            required
                        />
                        <TextInput.Field
                            form={form}
                            name="description"
                            textarea
                        />
                        <TagPicker.Field
                            form={form}
                            name="tags"
                        />
                        <SwitchField
                            form={form}
                            name="published"
                            label="Published"
                        />
                    </>
                )
            }
        </FormWrapper>
    )
}
