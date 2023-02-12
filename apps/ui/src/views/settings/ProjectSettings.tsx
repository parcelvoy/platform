import { useContext } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Project } from '../../types'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/FormWrapper'
import Heading from '../../ui/Heading'

export default function ProjectSettings() {
    const [project, setProject] = useContext(ProjectContext)

    async function handleSaveProject({ name, description, locale, timezone }: Project) {
        const value = await api.project.update(project.id, { name, description, locale, timezone })
        setProject(value)
    }

    return (
        <>
            <Heading size="h3" title="General" />
            <FormWrapper<Project>
                onSubmit={handleSaveProject}
                defaultValues={project}
                submitLabel="Save">
                {form => <>
                    <TextField form={form} name="name" required />
                    <TextField form={form} name="description" textarea />
                    <TextField form={form}
                        name="locale"
                        label="Default Locale"
                        subtitle="This locale will be used as the default when creating campaigns and when a users locale does not match any available ones."
                        required />
                    <TextField form={form}
                        name="timezone"
                        label="Timezone"
                        required />
                </>}
            </FormWrapper>
        </>
    )
}
