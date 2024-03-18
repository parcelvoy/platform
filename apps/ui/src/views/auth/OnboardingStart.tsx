import { LinkButton } from '../../ui/Button'
import { useTranslation } from 'react-i18next'

export default function Onboarding() {
    const { t } = useTranslation()
    return (
        <div className="auth-step">
            <h1>{t('welcome')}</h1>
            <p>{t('onboarding_installation_success')}</p>
            <LinkButton to="/onboarding/project">{t('get_started')}</LinkButton>
        </div>
    )
}
