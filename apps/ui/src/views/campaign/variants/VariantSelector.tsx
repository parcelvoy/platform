import { useContext, useState } from 'react'
import { TemplateContext } from '../../../contexts'
import Button from '../../../ui/Button'
import ButtonGroup from '../../../ui/ButtonGroup'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { useTranslation } from 'react-i18next'
import VariantListModal from './VariantListModal'

export default function VariantSelector() {
    const { t } = useTranslation()
    const [isListOpen, setIsListOpen] = useState(false)

    const {
        campaign,
        setCampaign,
        currentTemplate,
        variants,
        setTemplate,
    } = useContext(TemplateContext)

    if (variants.length === 0) return null

    return <>
        <ButtonGroup>
            {
                variants.length > 1 && (
                    <SingleSelect
                        options={variants}
                        size="small"
                        value={currentTemplate}
                        getOptionDisplay={(variant) => variant.name ?? 'Control'}
                        onChange={(variant) => setTemplate(variant)}
                    />
                )
            }
            {
                campaign.state !== 'finished' && (
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setIsListOpen(true)}
                    >{t('variants')}</Button>
                )
            }
        </ButtonGroup>
        <VariantListModal
            open={isListOpen}
            setIsOpen={(open) => setIsListOpen(open)}
            campaign={campaign}
            setCampaign={setCampaign} />
    </>
}
