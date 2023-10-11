import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext, UserContext } from '../../contexts'
import { useResolver } from '../../hooks'
import { SearchParams, UserEvent } from '../../types'
import Modal from '../../ui/Modal'
import { SearchTable } from '../../ui/SearchTable'
import { JsonPreview } from '../../ui'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { formatDate } from '../../utils'

export default function UserDetailEvents() {
    const [preferences] = useContext(PreferencesContext)
    const [project] = useContext(ProjectContext)
    const [user] = useContext(UserContext)
    const [params, setParams] = useState<SearchParams>({
        limit: 25,
        q: '',
    })
    const projectId = project.id
    const userId = user.id
    const [results] = useResolver(useCallback(async () => await api.users.events(projectId, userId, params), [projectId, userId, params]))
    const [event, setEvent] = useState<UserEvent>()

    return <>
        <SearchTable
            results={results}
            params={params}
            setParams={setParams}
            title="Events"
            itemKey={({ item }) => item.id}
            columns={[
                { key: 'name' },
                { key: 'created_at' },
            ]}
            onSelectRow={setEvent}
        />
        {event && (
            <Modal
                title={event.name}
                description={formatDate(preferences, event.created_at)}
                size="large"
                open={event != null}
                onClose={() => setEvent(undefined)}
            >
                <JsonPreview value={{ name: event.name, ...event.data, created_at: event.created_at }} />
            </Modal>
        )}
    </>
}
