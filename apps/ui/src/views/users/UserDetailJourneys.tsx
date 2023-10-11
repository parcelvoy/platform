import { useCallback, useContext } from 'react'
import { ProjectContext, UserContext } from '../../contexts'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import api from '../../api'
import { Tag } from '../../ui'
import { useNavigate } from 'react-router-dom'

export default function UserDetailJourneys() {

    const navigate = useNavigate()

    const [project] = useContext(ProjectContext)
    const [user] = useContext(UserContext)

    const projectId = project.id
    const userId = user.id

    const state = useSearchTableQueryState(useCallback(async params => await api.users.journeys.search(projectId, userId, params), [projectId, userId]))

    return (
        <SearchTable
            {...state}
            columns={[
                {
                    key: 'Journey',
                    cell: ({ item }) => item.journey!.name,
                },
                {
                    key: 'created_at',
                },
                {
                    key: 'ended_at',
                    cell: ({ item }) => item.ended_at ?? <Tag variant="info">Running</Tag>,
                },
            ]}
            onSelectRow={e => navigate(`../../entrances/${e.id}`)}
        />
    )
}
