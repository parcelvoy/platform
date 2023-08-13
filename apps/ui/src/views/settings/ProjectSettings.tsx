import { useContext } from 'react'
import { ProjectContext } from '../../contexts'
import Heading from '../../ui/Heading'
import { toast } from 'react-hot-toast/headless'
import ProjectForm from '../project/ProjectForm'

export default function ProjectSettings() {
    const [project, setProject] = useContext(ProjectContext)

    return (
        <>
            <Heading size="h3" title="General" />

            <ProjectForm project={project} onSave={(project) => {
                setProject(project)
                toast.success('Saved project settings')
            }} />
        </>
    )
}
