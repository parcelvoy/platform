import { useCallback, useContext } from 'react'
import { ProjectContext, UserContext } from '../../contexts'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import api from '../../api'
import { Tag } from '../../ui'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { formatDate } from '../../utils'

export default function UserDetailJourneys() {

    const { t } = useTranslation()
    const navigate = useNavigate()

    const [project] = useContext(ProjectContext)
    const [user] = useContext(UserContext)

    const projectId = project.id
    const userId = user.id

    const [preferences] = useContext(PreferencesContext)
    const state = useSearchTableQueryState(useCallback(async params => await api.users.journeys.search(projectId, userId, params), [projectId, userId]))

    return (
        <SearchTable
            {...state}
            title={t('journeys')}
            columns={[
                {
                    key: 'journey',
                    title: t('journey'),
                    cell: ({ item }) => item.journey!.name,
                },
                {
                    key: 'created_at',
                    title: t('created_at'),
                },
                {
                    key: 'ended_at',
                    title: t('ended_at'),
                    cell: ({ item }) => item.ended_at
                        ? formatDate(preferences, item.ended_at, 'Ppp')
                        : <Tag variant="info">{t('running')}</Tag>,
                },
            ]}
            onSelectRow={e => navigate(`../../entrances/${e.entrance_id}`)}
        />
    )
}
