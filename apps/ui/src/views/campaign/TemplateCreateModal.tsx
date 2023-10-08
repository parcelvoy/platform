import { Campaign, LocaleOption } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { LocaleParams, createLocale, localeOption } from './CampaignDetail'
import OptionField from '../../ui/form/OptionField'
import { useContext, useEffect, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { LinkButton } from '../../ui'

interface CreateTemplateParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    onCreate: (campaign: Campaign, locale: LocaleOption) => void
}

export default function CreateTemplateModal({ open, setIsOpen, campaign, onCreate }: CreateTemplateParams) {

    const [project] = useContext(ProjectContext)
    const [locales, setLocales] = useState<LocaleOption[]>([])
    useEffect(() => {
        api.locales.search(project.id, { limit: 100 })
            .then((result) => setLocales(result.results))
            .catch(() => {})
    }, [])

    async function handleCreateTemplate(params: LocaleParams) {
        const template = await createLocale(params, campaign)
        const newCampaign = { ...campaign }
        newCampaign.templates.push(template)
        onCreate(newCampaign, localeOption(params.locale))
        setIsOpen(false)
    }

    return (
        <Modal title="Create Template"
            open={open}
            onClose={() => setIsOpen(false)}
            zIndex={1000}>
            <FormWrapper<LocaleParams>
                onSubmit={async (params) => { await handleCreateTemplate(params) }}
                submitLabel="Create">
                {form => <>
                    <p>Each campaign can have one template per locale. Pick a locale to create a template for it.</p>
                    <SingleSelect.Field
                        form={form}
                        name="locale"
                        label="Locale"
                        options={locales}
                        toValue={option => option.key}
                        required />
                    <div className="label">
                        <LinkButton
                            size="small"
                            variant="secondary"
                            to={`/projects/${project.id}/settings/locales`}>Create Locale</LinkButton>
                    </div>
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
