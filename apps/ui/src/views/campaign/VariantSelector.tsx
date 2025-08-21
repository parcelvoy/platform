import { useContext, useState } from 'react'
import { TemplateContext } from '../../contexts'
import { Campaign, UseStateContext } from '../../types'
import Button from '../../ui/Button'
import ButtonGroup from '../../ui/ButtonGroup'
import { SingleSelect } from '../../ui/form/SingleSelect'
import LocaleEditModal from './LocaleEditModal'
import { useTranslation } from 'react-i18next'

interface LocaleSelectorParams {
    campaignState: UseStateContext<Campaign>
    showAddState?: UseStateContext<boolean>
}

export default function VariantSelector({
    campaignState,
    showAddState,
}: LocaleSelectorParams) {
    const { t } = useTranslation()
    const [editOpen, setEditOpen] = useState(false)
    const [_, setAddOpen] = showAddState ?? useState(false)
    const [campaign, setCampaign] = campaignState

    const { currentTemplate, variants, setTemplate } = useContext(TemplateContext)

    // const handleTemplateCreate = async (campaign: Campaign, locale: LocaleOption) => {
    //     setCampaign(campaign)
    //     const locales = [...allLocales, locale]
    //     setLocale({ currentLocale: locale, allLocales: locales })

    //     if (campaign.templates.length === 1 && campaign.channel === 'email') {
    //         await navigate('../editor')
    //     } else {
    //         setAddOpen(false)
    //     }
    // }

    return <>
        <ButtonGroup>
            {
                variants.length > 1 && (
                    <SingleSelect
                        options={variants}
                        size="small"
                        value={currentTemplate}
                        getOptionDisplay={(variant) => variant.id}
                        onChange={(variant) => {
                            console.log(variant)
                            setTemplate(variant)
                        }}
                    />
                )
            }
            {
                campaign.state !== 'finished' && (
                    variants.length > 1
                        ? <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setEditOpen(true)}
                        >{t('variants')}</Button>
                        : <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setAddOpen(true)}
                        >{t('campaign_variant_add')}</Button>
                )
            }
        </ButtonGroup>
        <LocaleEditModal
            open={editOpen}
            setIsOpen={setEditOpen}
            campaign={campaign}
            setCampaign={setCampaign}
            setAddOpen={setAddOpen} />
        {/* <TemplateCreateModal
            open={addOpen}
            setIsOpen={setAddOpen}
            campaign={campaign}
            onCreate={handleTemplateCreate} /> */}
    </>
}
