import { useCallback, useContext } from 'react'
import api from '../../api'
import { ProjectContext, UserContext } from '../../contexts'
import { SearchParams } from '../../types'
import ListTable from './ListTable'
import { useTranslation } from 'react-i18next'

export default function UserDetailLists() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const [user] = useContext(UserContext)
    const search = useCallback(async (params: SearchParams) => await api.users.lists(project.id, user.id, params), [api.users, project])

    return <>
        <ListTable search={search} title={t('lists')} />
    </>
}
