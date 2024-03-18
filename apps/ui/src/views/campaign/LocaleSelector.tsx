import { useContext, useState } from 'react'
import { LocaleContext } from '../../contexts'
import { Campaign, LocaleOption, UseStateContext } from '../../types'
import Button from '../../ui/Button'
import ButtonGroup from '../../ui/ButtonGroup'
import { SingleSelect } from '../../ui/form/SingleSelect'
import LocaleEditModal from './LocaleEditModal'
import { useNavigate } from 'react-router-dom'
import TemplateCreateModal from './TemplateCreateModal'
import { useTranslation } from 'react-i18next'

interface LocaleSelectorParams {
    campaignState: UseStateContext<Campaign>
    showAddState?: UseStateContext<boolean>
}

export default function LocaleSelector({
    campaignState,
    showAddState,
}: LocaleSelectorParams) {
    const { t } = useTranslation()
    const [editOpen, setEditOpen] = useState(false)
    const [addOpen, setAddOpen] = showAddState ?? useState(false)
    const [campaign, setCampaign] = campaignState
    const navigate = useNavigate()

    const [{ currentLocale, allLocales }, setLocale] = useContext(LocaleContext)

    function handleTemplateCreate(campaign: Campaign, locale: LocaleOption) {
        setCampaign(campaign)
        const locales = [...allLocales, locale]
        setLocale({ currentLocale: locale, allLocales: locales })

        if (campaign.templates.length === 1 && campaign.channel === 'email') {
            navigate('../editor')
        } else {
            setAddOpen(false)
        }
    }

    return <>
        <ButtonGroup>
            {
                currentLocale && (
                    <SingleSelect
                        options={allLocales}
                        size="small"
                        value={currentLocale}
                        onChange={(currentLocale) => setLocale({ currentLocale, allLocales })}
                    />
                )
            }
            {
                campaign.state !== 'finished' && (
                    allLocales.length > 0
                        ? <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setEditOpen(true)}
                        >{t('translations')}</Button>
                        : <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setAddOpen(true)}
                        >{t('add_translation')}</Button>
                )
            }
        </ButtonGroup>
        <LocaleEditModal
            open={editOpen}
            setIsOpen={setEditOpen}
            campaign={campaign}
            setCampaign={setCampaign}
            setAddOpen={setAddOpen} />
        <TemplateCreateModal
            open={addOpen}
            setIsOpen={setAddOpen}
            campaign={campaign}
            onCreate={handleTemplateCreate} />
    </>
}
