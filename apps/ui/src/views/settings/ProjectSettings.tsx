import { useContext } from 'react'
import { ProjectContext } from '../../contexts'
import Heading from '../../ui/Heading'
import { toast } from 'react-hot-toast/headless'
import ProjectForm from '../project/ProjectForm'
import { useTranslation } from 'react-i18next'

export default function ProjectSettings() {
    const { t } = useTranslation()
    const [project, setProject] = useContext(ProjectContext)

    return (
        <>
            <Heading size="h3" title={t('general')} />

            <ProjectForm project={project} onSave={(project) => {
                setProject(project)
                toast.success(t('project_settings_saved'))
            }} />
        </>
    )
}
