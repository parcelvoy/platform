import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TemplateContext } from '../../contexts'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import LocaleSelector from './locale/LocaleSelector'
import TemplateDetail from './TemplateDetail'
import VariantSelector from './variants/VariantSelector'

export default function CampaignDesign() {
    const { t } = useTranslation()
    const { currentTemplate, templates } = useContext(TemplateContext)
    const showAddState = useState(false)

    return (
        <>
            <Heading title={t('design')} size="h3" actions={
                <>
                    <VariantSelector />
                    <LocaleSelector showAddState={showAddState} />
                </>
            } />
            {templates.filter(template => template.id === currentTemplate?.id)
                .map(template => (
                    <TemplateDetail template={template} key={template.id} />
                ))}
            {!currentTemplate
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
