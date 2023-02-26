import { Campaign } from '../../types'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { languageName } from '../../utils'
import { UseFormReturn } from 'react-hook-form'
import { createLocale } from './CampaignDetail'
import { useMemo } from 'react'

interface CreateLocaleParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    setCampaign: (campaign: Campaign) => void
}

const LocaleTextField = ({ form }: { form: UseFormReturn<{ locale: string }> }) => {
    const watch = form.watch(['locale'])
    const { locale } = form.getValues()
    const language = useMemo(() => {
        try {
            return languageName(locale)
        } catch {
            return undefined
        }
    }, [watch])

    return <>
        <TextField form={form}
            name="locale"
            label="Locale"
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
