import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api'
import PageContent from '../../ui/PageContent'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import { useRoute } from '../router'
import { useTranslation } from 'react-i18next'

export default function UserTabs() {
    const { projectId = '' } = useParams()
    const { t } = useTranslation()
    const route = useRoute()
    const state = useSearchTableQueryState(useCallback(async params => await api.users.search(projectId, params), [projectId]))

    return <PageContent title={t('users')}>
        <SearchTable
            {...state}
            columns={[
                { key: 'full_name', title: t('name') },
                { key: 'external_id', title: t('external_id') },
                { key: 'email', title: t('email') },
                { key: 'phone', title: t('phone') },
                { key: 'locale', title: t('locale') },
                { key: 'created_at', title: t('created_at'), sortable: true },
            ]}
            onSelectRow={({ id }) => route(`users/${id}`)}
            enableSearch
            searchPlaceholder={t('search_users')}
        />
    </PageContent>
}
