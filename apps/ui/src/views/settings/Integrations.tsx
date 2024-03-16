import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Provider } from '../../types'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import { PlusIcon } from '../../ui/icons'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import IntegrationModal from './IntegrationModal'

export default function Integrations() {
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.providers.search(project.id, params), [project]))
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [provider, setProvider] = useState<Provider>()

    return (
        <>
            <Heading size="h3" title="Integrations" actions={
                <Button icon={<PlusIcon />} size="small" onClick={() => {
                    setProvider(undefined)
                    setIsModalOpen(true)
                }}>Add Integration</Button>
            } />
            <SearchTable
                {...state}
                columns={[
                    { key: 'name' },
                    { key: 'type' },
                    { key: 'group' },
                    { key: 'created_at' },
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
