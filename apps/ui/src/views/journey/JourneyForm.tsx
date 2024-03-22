import { useContext } from 'react'
import { toast } from 'react-hot-toast/headless'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Journey } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'
import SwitchField from '../../ui/form/SwitchField'
import { useTranslation } from 'react-i18next'

interface JourneyFormProps {
    journey?: Journey
    onSaved?: (journey: Journey) => void
}

export function JourneyForm({ journey, onSaved }: JourneyFormProps) {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    return (
        <FormWrapper<Journey>
            onSubmit={async ({ id, name, description, published = false, tags }) => {
                const saved = id
                    ? await api.journeys.update(project.id, id, { name, description, published, tags })
                    : await api.journeys.create(project.id, { name, description, published, tags })
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
                        <SwitchField
                            form={form}
                            name="published"
                            label={t('published')}
                        />
                    </>
                )
            }
        </FormWrapper>
    )
}
