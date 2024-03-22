import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Provider } from '../../types'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import { PlusIcon } from '../../ui/icons'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import IntegrationModal from './IntegrationModal'
import { useTranslation } from 'react-i18next'

export default function Integrations() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.providers.search(project.id, params), [project]))
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [provider, setProvider] = useState<Provider>()

    return (
        <>
            <Heading size="h3" title={t('integrations')} actions={
                <Button icon={<PlusIcon />} size="small" onClick={() => {
                    setProvider(undefined)
                    setIsModalOpen(true)
                }}>Add Integration</Button>
            } />
            <SearchTable
                {...state}
                columns={[
                    { key: 'name', title: t('name') },
                    { key: 'type', title: t('type') },
                    { key: 'group', title: t('group') },
                    { key: 'created_at', title: t('created_at') },
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
