import { useContext, useState } from 'react'
import { TemplateContext } from '../../../contexts'
import { Campaign, Template, VariantUpdateParams } from '../../../types'
import Button from '../../../ui/Button'
import ButtonGroup from '../../../ui/ButtonGroup'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { useTranslation } from 'react-i18next'
import VariantListModal from './VariantListModal'
import VariantFormModal from './VariantFormModal'

export default function VariantSelector() {
    const { t } = useTranslation()
    const [isListOpen, setIsListOpen] = useState(false)
    const [editVariant, setEditVariant] = useState<VariantUpdateParams | undefined>()

    const {
        campaign,
        setCampaign,
        currentTemplate,
        variants,
        setTemplate,
    } = useContext(TemplateContext)

    const handleTemplateCreate = async (campaign: Campaign, template: Template) => {
        setCampaign(campaign)
        setTemplate(template)
        setEditVariant(undefined)
    }

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
                    variants.length > 1
                        ? <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setIsListOpen(true)}
                        >{t('variants')}</Button>
                        : <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setEditVariant({ name: '' })}
                        >{t('campaign_variant_add')}</Button>
                )
            }
        </ButtonGroup>
        <VariantListModal
            open={isListOpen}
            setIsOpen={setIsListOpen}
            campaign={campaign}
            setCampaign={setCampaign}
            onSelectVariant={(variant) => setEditVariant(variant)} />
        <VariantFormModal
            variant={editVariant}
            onClose={() => setEditVariant(undefined)}
            campaign={campaign}
            onCreate={handleTemplateCreate} />
    </>
}
