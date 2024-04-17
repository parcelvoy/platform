import { useContext } from 'react'
import { ProjectContext } from '../../contexts'
import Heading from '../../ui/Heading'
import { toast } from 'react-hot-toast/headless'
import ProjectForm from '../project/ProjectForm'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui'
import api from '../../api'

export default function ProjectSettings() {
    const { t } = useTranslation()
    const [project, setProject] = useContext(ProjectContext)

    const handleRebuildAttributeSchema = async () => {
        await api.projects.rebuildPathSuggestions(project.id)
        toast.success(t('rebuild_path_suggestions_success'))
    }

    return (
        <>
            <Heading size="h3" title={t('general')} />

            <ProjectForm project={project} onSave={(project) => {
                setProject(project)
                toast.success(t('project_settings_saved'))
            }} />

            <br />
            <Heading size="h3" title={t('advanced')} />
            <label>
                <span>{t('rebuild_path_suggestions')}</span>
                <span className="label-subtitle">{t('rebuild_path_suggestions_desc')}</span>
                <Button variant="secondary" style={{ marginTop: '10px' }} onClick={async () => await handleRebuildAttributeSchema()}>{t('rebuild')}</Button>
            </label>
        </>
    )
}
