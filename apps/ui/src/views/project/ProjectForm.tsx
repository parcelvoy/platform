import { useNavigate } from 'react-router-dom'
import api from '../../api'
import TextField from '../../ui/form/TextField'
import { ProjectCreate } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'

export default function ProjectForm() {
    const navigate = useNavigate()

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
                        <TextField form={form} name="description" />
                    </>
                )
            }
        </FormWrapper>
    )
}
