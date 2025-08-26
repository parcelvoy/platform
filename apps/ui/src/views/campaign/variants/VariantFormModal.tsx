import { Campaign, Template, VariantUpdateParams } from '../../../types'
import FormWrapper from '../../../ui/form/FormWrapper'
import Modal from '../../../ui/Modal'
import { useContext } from 'react'
import { TemplateContext } from '../../../contexts'
import { useTranslation } from 'react-i18next'
import TextInput from '../../../ui/form/TextInput'
import api from '../../../api'

interface VariantFormParams {
    variant?: VariantUpdateParams
    onClose: () => void
    campaign: Campaign
    onCreate: (campaign: Campaign, template: Template) => void
}

export default function VariantFormModal({ variant, onClose, campaign, onCreate }: VariantFormParams) {

    const { t } = useTranslation()
    const { variants } = useContext(TemplateContext)

    async function handleSubmitVariant(params: VariantUpdateParams) {

        const clonedTemplate = variants[0]
        const template = params.id
            ? await api.templates.update(campaign.project_id, params.id, { name: params.name, data: clonedTemplate.data })
            : await api.templates.create(campaign.project_id, {
                name: params.name,
                campaign_id: campaign.id,
                type: campaign.channel,
                locale: clonedTemplate.locale,
                data: clonedTemplate.data,
            })

        const newCampaign = { ...campaign }
        const existing = newCampaign.templates.findIndex(t => t.id === template.id)
        if (existing > -1) {
            newCampaign.templates[existing] = template
        } else {
            newCampaign.templates.push(template)
        }
        onCreate(newCampaign, template)
        onClose()
    }

    return (
        <Modal title={variant?.id ? t('variant_update') : t('variant_create')}
            open={!!variant}
            onClose={() => onClose()}
            zIndex={2000}>
            <FormWrapper<VariantUpdateParams>
                onSubmit={async (params) => { await handleSubmitVariant(params) }}
                defaultValues={variant}
                submitLabel={variant?.id ? t('variant_save') : t('variant_create')}>
                {form => <>
                    <TextInput.Field
                        form={form}
                        name="name"
                        label={t('name')}
                        required />
                </>}
            </FormWrapper>
        </Modal>
    )
}
