import { useNavigate } from 'react-router-dom'
import api from '../../api'
import TextField from '../../ui/form/TextField'
import { ProjectCreate } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import { SingleSelect } from '../../ui/form/SingleSelect'

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Intl {
    type Key = 'calendar' | 'collation' | 'currency' | 'numberingSystem' | 'timeZone' | 'unit'
    function supportedValuesOf(input: Key): string[]
}

export default function ProjectForm() {
    const navigate = useNavigate()

    const timeZones = Intl.supportedValuesOf('timeZone')

    return (
        <FormWrapper<ProjectCreate>
            onSubmit={async project => {
                const { id } = await api.projects.create(project)
                navigate(`/projects/${id}`)
            }}
        >
            {
                form => (
                    <>
                        <TextField form={form} name="name" required />
                        <TextField form={form} name="description" textarea />
                        <TextField form={form}
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
