import { Campaign, LocaleOption } from '../../types'
import Modal from '../../ui/Modal'
import { DataTable } from '../../ui/DataTable'
import Button from '../../ui/Button'
import CreateLocaleModal from './CreateLocaleModal'
import { useContext } from 'react'
import api from '../../api'
import { LocaleContext } from '../../contexts'
import { useNavigate } from 'react-router-dom'
import { localeOption } from './CampaignDetail'

interface EditLocalesParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    campaign: Campaign
    setCampaign: (campaign: Campaign) => void
    addOpen: boolean
    setAddOpen: (state: boolean) => void
}

export default function EditLocalesModal({ open, setIsOpen, campaign, setCampaign, addOpen, setAddOpen }: EditLocalesParams) {

    const navigate = useNavigate()
    const [{ allLocales }, setLocale] = useContext(LocaleContext)

    function handleTemplateCreate(campaign: Campaign, locale: LocaleOption) {
        setCampaign(campaign)
        const locales = [...allLocales, locale]
        setLocale({ currentLocale: locale, allLocales: locales })

        if (campaign.templates.length === 1 && campaign.channel === 'email') {
            navigate('../editor')
        } else {
            setIsOpen(false)
        }
    }

    async function handleRemoveLocale(locale: string) {
        if (!confirm('Are you sure you want to delete this locale? The template cannot be recovered.')) return
        const { id } = campaign.templates.find(template => template.locale === locale)!
        await api.templates.delete(campaign.project_id, id)

        const templates = campaign.templates.filter(template => template.id !== id)
        const newCampaign = { ...campaign, templates }
        setCampaign(newCampaign)

        const template = campaign.templates[0]
        setLocale({
            currentLocale: template ? localeOption(template.locale) : undefined,
            allLocales: allLocales.filter(item => item.key !== locale),
        })
        setIsOpen(false)
    }

    return (
        <Modal title="Translations"
            description="Manage the translations your email supports and will send to."
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
                <Button size="small" onClick={() => setAddOpen(true)}>Add Locale</Button>
            </div>
            <CreateLocaleModal
                open={addOpen}
                setIsOpen={setAddOpen}
                campaign={campaign}
                onCreate={handleTemplateCreate} />
        </Modal>
    )
}
