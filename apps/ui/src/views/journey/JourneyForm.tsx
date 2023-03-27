import { useContext } from 'react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Journey } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'

interface JourneyFormProps {
    journey?: Journey
    onSaved?: (journey: Journey) => void
}

export function JourneyForm({ journey, onSaved }: JourneyFormProps) {
    const [project] = useContext(ProjectContext)
    return (
        <FormWrapper<Journey>
            onSubmit={async ({ id, name, description, tags }) => {
                const saved = id
                    ? await api.journeys.update(project.id, id, { name, description, tags })
                    : await api.journeys.create(project.id, { name, description, tags })
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
                    </>
                )
            }
        </FormWrapper>
    )
}
