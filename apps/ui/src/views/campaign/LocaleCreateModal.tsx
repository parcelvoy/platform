import { Campaign, LocaleOption } from '../../types'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { languageName } from '../../utils'
import { UseFormReturn } from 'react-hook-form'
import { LocaleParams, createLocale, localeOption } from './CampaignDetail'
import { useState } from 'react'
import OptionField from '../../ui/form/OptionField'

interface CreateLocaleParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    onCreate: (campaign: Campaign, locale: LocaleOption) => void
}

const LocaleTextField = ({ form }: { form: UseFormReturn<LocaleParams> }) => {

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

export default function CreateLocaleModal({ open, setIsOpen, campaign, onCreate }: CreateLocaleParams) {

    async function handleCreateLocale(params: LocaleParams) {
        const template = await createLocale(params, campaign)
        const newCampaign = { ...campaign }
        newCampaign.templates.push(template)
        onCreate(newCampaign, localeOption(params.locale))
        setIsOpen(false)
    }

    return (
        <Modal title={'Create Template'}
            open={open}
            onClose={() => setIsOpen(false)}
            zIndex={1000}>
            <FormWrapper<LocaleParams>
                onSubmit={async (params) => { await handleCreateLocale(params) }}
                submitLabel="Create">
                {form => <>
                    <p>Each campaign can have one template per locale. Pick a locale to create a template for it.</p>
                    <LocaleTextField form={form} />
                    { campaign.channel === 'email' && (
                        <OptionField
                            form={form}
                            name="data.editor"
                            label="Editor Type"
                            options={[
                                { key: 'visual', label: 'Visual' },
                                { key: 'code', label: 'Code' },
                            ]}
                        />
                    )}
                </>}
            </FormWrapper>
        </Modal>
    )
}
