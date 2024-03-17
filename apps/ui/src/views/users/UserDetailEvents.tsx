import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext, UserContext } from '../../contexts'
import { useResolver } from '../../hooks'
import { SearchParams, UserEvent } from '../../types'
import Modal from '../../ui/Modal'
import { SearchTable } from '../../ui/SearchTable'
import { Column, Columns, JsonPreview } from '../../ui'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { formatDate } from '../../utils'
import Iframe from '../../ui/Iframe'
import { useTranslation } from 'react-i18next'

export default function UserDetailEvents() {
    const { t } = useTranslation()
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
    const hasPreview = !!event?.data?.result?.message?.html

    return <>
        <SearchTable
            results={results}
            params={params}
            setParams={setParams}
            title={t('events')}
            itemKey={({ item }) => item.id}
            columns={[
                { key: 'name', title: t('name') },
                { key: 'created_at', title: t('created_at') },
            ]}
            onSelectRow={setEvent}
        />
        {event && (hasPreview
            ? (
                <Modal
                    title={event.name}
                    size="fullscreen"
                    open={event != null}
                    onClose={() => setEvent(undefined)}
                >
                    <Columns>
                        <Column style={{ padding: '20px' }}>
                            {formatDate(preferences, event.created_at)}
                            <JsonPreview value={{ name: event.name, ...event.data, created_at: event.created_at }} />
                        </Column>
                        <Column>
                            {event.name === 'email_sent' && event.data?.result?.message?.html && <Iframe content={event.data.result.message.html ?? ''} fullHeight={true} /> }
                        </Column>
                    </Columns>
                </Modal>
            )
            : (
                <Modal
                    title={event.name}
                    description={formatDate(preferences, event.created_at)}
                    size="large"
                    open={event != null}
                    onClose={() => setEvent(undefined)}
                >
                    <JsonPreview value={{ name: event.name, ...event.data, created_at: event.created_at }} />
                </Modal>
            )
        )}
    </>
}
