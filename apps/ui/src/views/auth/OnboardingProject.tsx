import { useNavigate } from 'react-router-dom'
import ProjectForm from '../project/ProjectForm'
import { useTranslation } from 'react-i18next'

export default function OnboardingProject() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    return (
        <div className="auth-step">
            <h1>{t('onboarding_project_setup_title')}</h1>
            <p>{t('onboarding_project_setup_description')}</p>
            <ProjectForm onSave={({ id }) => navigate('/projects/' + id)} />
        </div>
    )
}
