import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Provider } from '../../types'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import { ArchiveIcon, PlusIcon } from '../../ui/icons'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import IntegrationModal from './IntegrationModal'
import { useTranslation } from 'react-i18next'
import { Menu, MenuItem } from '../../ui'

export default function Integrations() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.providers.search(project.id, params), [project]))
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [provider, setProvider] = useState<Provider>()
    const handleArchive = async (id: number) => {
        if (!confirm(t('delete_integration_confirmation'))) return
        await api.providers.delete(project.id, id)
        await state.reload()
    }

    return (
        <>
            <Heading size="h3" title={t('integrations')} actions={
                <Button icon={<PlusIcon />} size="small" onClick={() => {
                    setProvider(undefined)
                    setIsModalOpen(true)
                }}>{t('add_integration')}</Button>
            } />
            <SearchTable
                {...state}
                columns={[
                    { key: 'name', title: t('name') },
                    { key: 'type', title: t('type') },
                    { key: 'group', title: t('group') },
                    { key: 'created_at', title: t('created_at') },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item: { id } }) => (
                            <Menu size="small">
                                <MenuItem onClick={async () => await handleArchive(id)}>
                                    <ArchiveIcon />{t('archive')}
                                </MenuItem>
                            </Menu>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={(provider: Provider) => {
                    setProvider(provider)
                    setIsModalOpen(true)
                }}
            />
            <IntegrationModal
                open={isModalOpen}
                onClose={setIsModalOpen}
                provider={provider}
                onChange={async () => await state.reload()} />
        </>
    )
}
