import { JsonViewer } from '@textea/json-viewer'
import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext, UserContext } from '../../contexts'
import { useResolver } from '../../hooks'
import { SearchParams, UserEvent } from '../../types'
import Modal from '../../ui/Modal'
import { SearchTable } from '../../ui/SearchTable'

export default function UserDetailEvents() {
    const [project] = useContext(ProjectContext)
    const [user] = useContext(UserContext)
    const [params, setParams] = useState<SearchParams>({
        page: 0,
        itemsPerPage: 10,
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
            onSelectRow={(event) => {
                setEvent(event)
            }}
        />
        <Modal title={event?.name}
            size="regular"
            open={event != null}
            onClose={() => setEvent(undefined)}
        >
            <JsonViewer value={{ name: event?.name, ...event?.data }} rootName={false} />
        </Modal>
    </>
}
