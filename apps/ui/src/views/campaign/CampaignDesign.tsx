import { useContext, useState } from 'react'
import { CampaignContext, LocaleContext } from '../../contexts'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import LocaleSelector from './LocaleSelector'
import TemplateDetail from './TemplateDetail'

export default function CampaignDesign() {
    const campaignState = useContext(CampaignContext)
    const { templates } = campaignState[0]
    const [{ currentLocale }] = useContext(LocaleContext)
    const openState = useState(false)

    return (
        <>
            <Heading title="Design" size="h3" actions={
                <LocaleSelector
                    campaignState={campaignState}
                    openState={openState} />
            } />
            {templates.filter(template => template.locale === currentLocale)
                .map(template => (
                    <TemplateDetail template={template} key={template.id} />
                ))}
            {!currentLocale
                && <Alert
                    variant="plain"
                    title="Add Template"
                    body="There are no templates yet for this campaign. Add a locale above or use the button below to get started"
                    actions={<Button onClick={() => openState[1](true)}>Create Template</Button>}
                />
            }
        </>
    )
}
