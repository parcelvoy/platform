import { useContext, useState } from 'react'
import { CampaignContext, LocaleContext } from '../../contexts'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import LocaleSelector from './LocaleSelector'
import TemplateDetail from './TemplateDetail'
import { useTranslation } from 'react-i18next'

export default function CampaignDesign() {
    const { t } = useTranslation()
    const campaignState = useContext(CampaignContext)
    const { templates } = campaignState[0]
    const [{ currentLocale }] = useContext(LocaleContext)
    const showAddState = useState(false)

    return (
        <>
            <Heading title={t('design')} size="h3" actions={
                <LocaleSelector
                    campaignState={campaignState}
                    showAddState={showAddState} />
            } />
            {templates.filter(template => template.locale === currentLocale?.key)
                .map(template => (
                    <TemplateDetail template={template} key={template.id} />
                ))}
            {!currentLocale
                && <Alert
                    variant="plain"
                    title={t('add_template')}
                    body={(t('no_template_alert_body'))}
                    actions={<Button onClick={() => showAddState[1](true)}>{t('create_template')}</Button>}
                />
            }
        </>
    )
}
