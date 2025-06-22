import { useContext } from 'react'
import { toast } from 'react-hot-toast/headless'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Journey } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'
import { useTranslation } from 'react-i18next'
import RadioInput from '../../ui/form/RadioInput'

interface JourneyFormProps {
    journey?: Journey
    onSaved?: (journey: Journey) => void
}

export function JourneyForm({ journey, onSaved }: JourneyFormProps) {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const statusOptions = [
        { key: 'live', label: t('live') },
        { key: 'off', label: t('off') },
    ]
    return (
        <FormWrapper<Journey>
            onSubmit={async ({ id, name, description, status, tags }) => {
                const saved = id
                    ? await api.journeys.update(project.id, id, { name, description, status, tags })
                    : await api.journeys.create(project.id, { name, description, status, tags })
                toast.success(t('journey_saved'))
                onSaved?.(saved)
            }}
            defaultValues={journey}
            submitLabel={t('save')}
        >
            {
                form => (
                    <>
                        <TextInput.Field
                            form={form}
                            name="name"
                            label={t('name')}
                            required
                        />
                        <TextInput.Field
                            form={form}
                            name="description"
                            label={t('description')}
                            textarea
                        />
                        <TagPicker.Field
                            form={form}
                            name="tags"
                            label={t('tags')}
                        />
                        {journey?.status}
                        <RadioInput.Field
                            form={form}
                            name="status"
                            label={t('status')}
                            options={statusOptions}
                            required
                        />
                    </>
                )
            }
        </FormWrapper>
    )
}
