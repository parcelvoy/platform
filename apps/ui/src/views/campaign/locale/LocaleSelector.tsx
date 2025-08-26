import { useContext, useState } from 'react'
import { TemplateContext } from '../../../contexts'
import { Campaign, LocaleOption, UseStateContext } from '../../../types'
import Button from '../../../ui/Button'
import ButtonGroup from '../../../ui/ButtonGroup'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import LocaleListModal from './LocaleListModal'
import { useNavigate } from 'react-router'
import TemplateCreateModal from '../TemplateCreateModal'
import { useTranslation } from 'react-i18next'

interface LocaleSelectorParams {
    showAddState?: UseStateContext<boolean>
}

export default function LocaleSelector({ showAddState }: LocaleSelectorParams) {
    const { t } = useTranslation()
    const [editOpen, setEditOpen] = useState(false)
    const [addOpen, setAddOpen] = showAddState ?? useState(false)
    const navigate = useNavigate()

    const {
        campaign,
        setCampaign,
        currentLocale,
        locales,
        setTemplate,
    } = useContext(TemplateContext)

    const handleTemplateCreate = async (campaign: Campaign, locale: LocaleOption) => {
        setCampaign(campaign)
        handleLocaleSelect(locale)

        if (campaign.templates.length === 1 && campaign.channel === 'email') {
            await navigate('../editor')
        } else {
            setAddOpen(false)
        }
    }

    const handleLocaleSelect = (locale: LocaleOption) => {
        setTemplate(campaign.templates.find(t => t.locale === locale.key))
    }

    return <>
        <ButtonGroup>
            {
                currentLocale && (
                    <SingleSelect
                        options={locales}
                        size="small"
                        value={currentLocale}
                        onChange={locale => handleLocaleSelect(locale)}
                    />
                )
            }
            {
                campaign.state !== 'finished' && (
                    locales.length > 0
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
        <LocaleListModal
            open={editOpen}
            setIsOpen={setEditOpen}
            setAddOpen={setAddOpen} />
        <TemplateCreateModal
            open={addOpen}
            setIsOpen={setAddOpen}
            campaign={campaign}
            onCreate={handleTemplateCreate} />
    </>
}
