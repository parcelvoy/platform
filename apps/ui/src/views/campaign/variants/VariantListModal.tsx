import { Campaign, Template, VariantUpdateParams } from '../../../types'
import Modal from '../../../ui/Modal'
import { DataTable } from '../../../ui/DataTable'
import Button from '../../../ui/Button'
import { useContext, useState } from 'react'
import api from '../../../api'
import { TemplateContext } from '../../../contexts'
import { useTranslation } from 'react-i18next'
import VariantFormModal from './VariantFormModal'

interface VariantEditParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    setCampaign: (campaign: Campaign) => void
}

export default function VariantListModal({ open, setIsOpen, campaign, setCampaign }: VariantEditParams) {
    const { t } = useTranslation()
    const { variants, setTemplate } = useContext(TemplateContext)
    const [editVariant, setEditVariant] = useState<VariantUpdateParams | undefined>()

    const handleRemoveVariant = async (id: number) => {
        if (!confirm(t('variant_remove_warning'))) return
        await api.templates.delete(campaign.project_id, id)

        const templates = campaign.templates.filter(template => template.id !== id)
        const newCampaign = { ...campaign, templates }
        setCampaign(newCampaign)
        setTemplate(templates[0])
    }

    const handleCreateVariant = async (campaign: Campaign, template: Template) => {
        setCampaign(campaign)
        setTemplate(template)
        setEditVariant(undefined)
    }

    return (
        <Modal title={t('variants')}
            description={t('variants_description')}
            open={open}
            onClose={() => setIsOpen(false)}>
            <DataTable
                items={variants}
                itemKey={({ item }) => item.id}
                onSelectRow={(item) => setEditVariant(item)}
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
                                onClick={async (event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    await handleRemoveVariant(item.id)
                                }}>
                                {t('delete')}
                            </Button>
                        ),
                    },
                ]} />
            <div className="modal-footer">
                <Button size="small" onClick={() => setEditVariant({ name: '' })}>{t('variant_add')}</Button>
            </div>

            <VariantFormModal
                variant={editVariant}
                onClose={() => setEditVariant(undefined)}
                campaign={campaign}
                onCreate={handleCreateVariant} />
        </Modal>
    )
}
