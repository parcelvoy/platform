import { Campaign, VariantUpdateParams } from '../../../types'
import Modal from '../../../ui/Modal'
import { DataTable } from '../../../ui/DataTable'
import Button from '../../../ui/Button'
import { useContext } from 'react'
import api from '../../../api'
import { TemplateContext } from '../../../contexts'
import { useTranslation } from 'react-i18next'

interface VariantEditParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    setCampaign: (campaign: Campaign) => void
    onSelectVariant: (template: VariantUpdateParams) => void
}

export default function VariantListModal({ open, setIsOpen, campaign, setCampaign, onSelectVariant }: VariantEditParams) {
    const { t } = useTranslation()
    const { variants } = useContext(TemplateContext)

    const handleRemoveVariant = async (id: number) => {
        if (!confirm(t('remove_locale_warning'))) return
        await api.templates.delete(campaign.project_id, id)

        const templates = campaign.templates.filter(template => template.id !== id)
        const newCampaign = { ...campaign, templates }
        setCampaign(newCampaign)
    }

    return (
        <Modal title={t('variants')}
            description={t('translations_description')}
            open={open}
            onClose={() => setIsOpen(false)}>
            <DataTable
                items={variants}
                itemKey={({ item }) => item.id}
                onSelectRow={(item) => onSelectVariant(item)}
                columns={[
                    {
                        key: 'label',
                        title: t('variant'),
                        cell: ({ item }) => item.name,
                    },
                    { key: 'locale', title: t('locale') },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={async () => await handleRemoveVariant(item.id)}>
                                {t('delete')}
                            </Button>
                        ),
                    },
                ]} />
            <div className="modal-footer">
                <Button size="small" onClick={() => onSelectVariant({ name: '' })}>{t('variant_add')}</Button>
            </div>
        </Modal>
    )
}
