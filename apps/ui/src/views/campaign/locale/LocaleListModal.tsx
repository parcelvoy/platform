import Modal from '../../../ui/Modal'
import { DataTable } from '../../../ui/DataTable'
import Button from '../../../ui/Button'
import { useContext } from 'react'
import api from '../../../api'
import { languageName } from '../../../utils'
import { useTranslation } from 'react-i18next'
import { TemplateContext } from '../../../contexts'

interface EditLocalesParams {
    open: boolean
    setIsOpen: (state: boolean) => void
    setAddOpen: (state: boolean) => void
}

export default function EditLocalesModal({ open, setIsOpen, setAddOpen }: EditLocalesParams) {
    const { t } = useTranslation()
    const {
        campaign,
        setCampaign,
        locales,
    } = useContext(TemplateContext)

    async function handleRemoveLocale(locale: string) {
        if (!confirm(t('remove_locale_warning'))) return
        const { id } = campaign.templates.find(template => template.locale === locale)!
        await api.templates.delete(campaign.project_id, id)

        const templates = campaign.templates.filter(template => template.id !== id)
        const newCampaign = { ...campaign, templates }
        setCampaign(newCampaign)
    }

    return (
        <Modal title={t('translations')}
            description={t('translations_description')}
            open={open}
            onClose={() => setIsOpen(false)}>
            <DataTable
                items={locales}
                itemKey={({ item }) => item.key}
                columns={[
                    {
                        key: 'label',
                        title: t('language'),
                        cell: ({ item }) => languageName(item.key),
                    },
                    { key: 'key', title: t('locale') },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item }) => (
                            <Button
                                size="small"
                                variant="destructive"
                                onClick={async () => await handleRemoveLocale(item.key)}>
                                {t('delete')}
                            </Button>
                        ),
                    },
                ]} />
            <div className="modal-footer">
                <Button size="small" onClick={() => setAddOpen(true)}>{t('add_locale')}</Button>
            </div>
        </Modal>
    )
}
