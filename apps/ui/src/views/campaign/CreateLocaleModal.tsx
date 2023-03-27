import { Campaign } from '../../types'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { languageName } from '../../utils'
import { UseFormReturn } from 'react-hook-form'
import { createLocale } from './CampaignDetail'
import { useState } from 'react'

interface CreateLocaleParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    setCampaign: (campaign: Campaign) => void
}

const LocaleTextField = ({ form }: { form: UseFormReturn<{ locale: string }> }) => {

    const [language, setLanguage] = useState<string | undefined>(undefined)
    const handlePreviewLanguage = (locale: string) => {
        try {
            return setLanguage(languageName(locale))
        } catch {
            return setLanguage(undefined)
        }
    }

    return <>
        <TextInput.Field form={form}
            name="locale"
            label="Locale"
            onChange={handlePreviewLanguage}
            required />
        <p>{language}</p>
    </>
}

export default function CreateLocaleModal({ open, setIsOpen, campaign, setCampaign }: CreateLocaleParams) {

    async function handleCreateLocale(locale: string) {
        const template = await createLocale(locale, campaign)
        const newCampaign = { ...campaign }
        newCampaign.templates.push(template)
        setCampaign(newCampaign)
        setIsOpen(false)
    }

    return (
        <Modal title="Add Locale"
            open={open}
            onClose={() => setIsOpen(false)}>
            <FormWrapper<{ locale: string }>
                onSubmit={async (item) => { await handleCreateLocale(item.locale) }}
                submitLabel="Create">
                {form => <>
                    <p>Each campaign can have one template per locale. Pick a locale to create a template for it.</p>
                    <LocaleTextField form={form} />
                </>}
            </FormWrapper>
        </Modal>
    )
}
