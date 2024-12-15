import { Key } from 'react'
import { List, ListState, SearchParams, SearchResult } from '../../types'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import Tag, { TagVariant } from '../../ui/Tag'
import { snakeToTitle } from '../../utils'
import { useRoute } from '../router'
import Menu, { MenuItem } from '../../ui/Menu'
import { ArchiveIcon, DuplicateIcon, EditIcon } from '../../ui/icons'
import api from '../../api'
import { useNavigate, useParams } from 'react-router-dom'
import { Translation, useTranslation } from 'react-i18next'

interface ListTableParams {
    search: (params: SearchParams) => Promise<SearchResult<List>>
    title?: string
    selectedRow?: Key
    onSelectRow?: (list: List) => void
}

export const ListTag = ({ state, progress }: Pick<List, 'state' | 'progress'>) => {
    const variant: Record<ListState, TagVariant> = {
        draft: 'plain',
        loading: 'info',
        ready: 'success',
    }

    const complete = progress?.complete ?? 0
    const total = progress?.total ?? 0
    const percent = total > 0 ? complete / total : 0
    const percentStr = percent.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 0 })

    return <Tag variant={variant[state]}>
        <Translation>{ (t) => t(state) }</Translation>
        {progress && ` (${percentStr})`}
    </Tag>
}

export default function ListTable({ search, selectedRow, onSelectRow, title }: ListTableParams) {
    const route = useRoute()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { projectId = '' } = useParams()

    function handleOnSelectRow(list: List) {
        onSelectRow ? onSelectRow(list) : route(`lists/${list.id}`)
    }

    const handleDuplicateList = async (id: number) => {
        const list = await api.lists.duplicate(projectId, id)
        navigate(list.id.toString())
    }

    const handleArchiveList = async (id: number) => {
        await api.lists.delete(projectId, id)
        await state.reload()
    }

    const state = useSearchTableState(search)

    return (
        <SearchTable
            {...state}
            title={title}
            itemKey={({ item }) => item.id}
            columns={[
                {
                    key: 'name',
                    title: t('name'),
                    sortable: true,
                },
                {
                    key: 'type',
                    title: t('type'),
                    cell: ({ item: { type } }) => snakeToTitle(type),
                    sortable: true,
                },
                {
                    key: 'state',
                    title: t('state'),
                    cell: ({ item: { state } }) => ListTag({ state }),
                    sortable: true,
                },
                {
                    key: 'users_count',
                    title: t('users_count'),
                    cell: ({ item }) => item.users_count?.toLocaleString(),
                },
                {
                    key: 'created_at',
                    title: t('created_at'),
                    sortable: true,
                },
                {
                    key: 'updated_at',
                    title: t('updated_at'),
                    sortable: true,
                },
                {
                    key: 'options',
                    title: t('options'),
                    cell: ({ item }) => (
                        <Menu size="small">
                            <MenuItem onClick={() => handleOnSelectRow(item)}>
                                <EditIcon />{t('edit')}
                            </MenuItem>
                            <MenuItem onClick={async () => await handleDuplicateList(item.id)}>
                                <DuplicateIcon />{t('duplicate')}
                            </MenuItem>
                            <MenuItem onClick={async () => await handleArchiveList(item.id)}>
                                <ArchiveIcon />{t('archive')}
                            </MenuItem>
                        </Menu>
                    ),
                },
            ]}
            selectedRow={selectedRow}
            onSelectRow={list => handleOnSelectRow(list)}
            enableSearch
            tagEntity="lists"
        />
    )
}
