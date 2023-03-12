import { useContext } from 'react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Journey } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import TextField from '../../ui/form/TextField'
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
                        <TextField
                            form={form}
                            name="name"
                            required
                        />
                        <TextField
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
