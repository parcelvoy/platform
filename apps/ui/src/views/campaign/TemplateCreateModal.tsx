import { Campaign, LocaleOption } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { LocaleParams, createLocale, localeOption } from './CampaignDetail'
import RadioInput from '../../ui/form/RadioInput'
import { useContext, useEffect, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { LinkButton } from '../../ui'
import { useTranslation } from 'react-i18next'

interface CreateTemplateParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    onCreate: (campaign: Campaign, locale: LocaleOption) => void
}

export default function CreateTemplateModal({ open, setIsOpen, campaign, onCreate }: CreateTemplateParams) {

    const { t } = useTranslation()
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
                    <div className="label">
                        <LinkButton
                            size="small"
                            variant="secondary"
                            to={`/projects/${project.id}/settings/locales`}>{t('create_locale')}</LinkButton>
                    </div>
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
