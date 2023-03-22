import { Campaign } from '../../types'
import Modal from '../../ui/Modal'
import { DataTable } from '../../ui/DataTable'
import Button from '../../ui/Button'
import { locales } from './CampaignDetail'
import CreateLocaleModal from './CreateLocaleModal'
import { useState } from 'react'
import api from '../../api'

interface EditLocalesParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    setCampaign: (campaign: Campaign) => void
}

export default function EditLocalesModal({ open, setIsOpen, campaign, setCampaign }: EditLocalesParams) {

    const allLocales = locales(campaign.templates)
    const [showAddLocale, setShowAddLocale] = useState(false)

    async function handleRemoveLocale(locale: string) {
        if (!confirm('Are you sure you want to delete this locale? The template cannot be recovered.')) return
        const { id } = campaign.templates.find(template => template.locale === locale)!
        await api.templates.delete(campaign.project_id, id)

        const templates = campaign.templates.filter(template => template.id !== id)
        const newCampaign = { ...campaign, templates }
        setCampaign(newCampaign)
        setIsOpen(false)
    }

    return (
        <Modal title="Locales"
            open={open}
            onClose={() => setIsOpen(false)}>
            <DataTable
                items={allLocales}
                itemKey={({ item }) => item.key}
                columns={[
                    { key: 'label', title: 'Language' },
                    { key: 'key', title: 'Locale' },
                    {
                        key: 'options',
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={async () => await handleRemoveLocale(item.key)}>
                                Delete
                            </Button>
                        ),
                    },
                ]} />
            <div className="modal-footer">
                <Button size="small" onClick={() => setShowAddLocale(true)}>Add Locale</Button>
            </div>
            <CreateLocaleModal
                open={showAddLocale}
                setIsOpen={setShowAddLocale}
                campaign={campaign}
                setCampaign={setCampaign} />
        </Modal>
    )
}
