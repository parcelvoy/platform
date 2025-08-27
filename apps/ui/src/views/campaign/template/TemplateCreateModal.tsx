import { Campaign, LocaleOption } from '../../../types'
import FormWrapper from '../../../ui/form/FormWrapper'
import Modal from '../../../ui/Modal'
import RadioInput from '../../../ui/form/RadioInput'
import { useContext, useEffect, useState } from 'react'
import api from '../../../api'
import { AdminContext, ProjectContext } from '../../../contexts'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { LinkButton } from '../../../ui'
import { useTranslation } from 'react-i18next'
import { checkOrganizationRole } from '../../../utils'
import { localeOption } from './TemplateContextProvider'

interface CreateTemplateParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    onCreate: (campaign: Campaign, locale: LocaleOption) => void
}

interface LocaleParams {
    locale: string
    data: {
        editor: string
    }
}

export default function CreateTemplateModal({ open, setIsOpen, campaign, onCreate }: CreateTemplateParams) {

    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const admin = useContext(AdminContext)
    const [locales, setLocales] = useState<LocaleOption[]>([])
    useEffect(() => {
        api.locales.search(project.id, { limit: 100 })
            .then((result) => setLocales(result.results))
            .catch(() => {})
    }, [])

    async function handleCreateTemplate({ locale, data }: LocaleParams) {
        const clonedTemplate = campaign.templates.find(template => template.locale === 'en') ?? campaign.templates[0]
        const template = await api.templates.create(campaign.project_id, {
            campaign_id: campaign.id,
            type: campaign.channel,
            locale,
            data: clonedTemplate?.data || data ? { ...clonedTemplate?.data, ...data } : undefined,
        })

        const newCampaign = { ...campaign }
        newCampaign.templates.push(template)
        onCreate(newCampaign, localeOption(locale))
        setIsOpen(false)
    }

    return (
        <Modal title={t('create_template')}
            open={open}
            onClose={() => setIsOpen(false)}
            zIndex={1000}>
            <FormWrapper<LocaleParams>
                onSubmit={async (params) => { await handleCreateTemplate(params) }}
                submitLabel={t('create')}>
                {form => <>
                    <p>{t('create_template_description')}</p>
                    <SingleSelect.Field
                        form={form}
                        name="locale"
                        label={t('locale')}
                        options={locales}
                        toValue={option => option.key}
                        required />
                    {checkOrganizationRole('admin', admin?.role) && <div className="label">
                        <LinkButton
                            size="small"
                            variant="secondary"
                            to={`/projects/${project.id}/settings/locales`}>{t('create_locale')}</LinkButton>
                    </div>}
                    { campaign.channel === 'email' && (
                        <RadioInput.Field
                            form={form}
                            name="data.editor"
                            label={t('editor_type')}
                            options={[
                                { key: 'visual', label: t('visual') },
                                { key: 'code', label: t('code') },
                            ]}
                        />
                    )}
                </>}
            </FormWrapper>
        </Modal>
    )
}
