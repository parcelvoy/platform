import { useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'

export default function Subscriptions() {
    const navigate = useNavigate()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.subscriptions.search(project.id, params), [project]))

    return (
        <SearchTable
            {...state}
            columns={[
                { key: 'name' },
                { key: 'channel' },
            ]}
            itemKey={({ item }) => item.id}
            onSelectRow={(row) => navigate(`${row.id}`)}
            title='Subscriptions'
        />
    )
}
