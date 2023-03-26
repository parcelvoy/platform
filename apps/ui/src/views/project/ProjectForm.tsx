import api from '../../api'
import TextInput from '../../ui/form/TextInput'
import { Project } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Intl {
    type Key = 'calendar' | 'collation' | 'currency' | 'numberingSystem' | 'timeZone' | 'unit'
    function supportedValuesOf(input: Key): string[]
}

interface ProjectFormProps {
    onSave?: (project: Project) => void
}

export default function ProjectForm({ onSave }: ProjectFormProps) {
    const timeZones = Intl.supportedValuesOf('timeZone')
    return (
        <FormWrapper<Project>
            onSubmit={async ({ id, name, description, locale, timezone }) => {
                const project = id
                    ? await api.projects.update(id, { name, description, locale, timezone })
                    : await api.projects.create({ name, description, locale, timezone })
                onSave?.(project)
            }}
        >
            {
                form => (
                    <>
                        <TextInput.Field form={form} name="name" required />
                        <TextInput.Field form={form} name="description" textarea />
                        <TextInput.Field form={form}
                            name="locale"
                            label="Default Locale"
                            subtitle="This locale will be used as the default when creating campaigns and when a users locale does not match any available ones."
                            required />
                        <SingleSelect.Field
                            form={form}
                            options={timeZones}
                            name="timezone"
                            label="Timezone"
                            required
                        />
                    </>
                )
            }
        </FormWrapper>
    )
}
