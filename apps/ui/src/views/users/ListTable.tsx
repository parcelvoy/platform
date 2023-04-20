import { Key } from 'react'
import { List, ListState, SearchParams, SearchResult } from '../../types'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import Tag from '../../ui/Tag'
import { snakeToTitle } from '../../utils'
import { useRoute } from '../router'

interface ListTableParams {
    search: (params: SearchParams) => Promise<SearchResult<List>>
    title?: string
    selectedRow?: Key
    onSelectRow?: (list: List) => void
}

export const ListTag = ({ state }: { state: ListState }) => {
    return (
        <Tag variant={state === 'ready' ? 'success' : 'info'}>
            {snakeToTitle(state)}
        </Tag>
    )
}

export default function ListTable({ search, selectedRow, onSelectRow, title }: ListTableParams) {
    const route = useRoute()
    function handleOnSelectRow(list: List) {
        onSelectRow ? onSelectRow(list) : route(`lists/${list.id}`)
    }

    const state = useSearchTableState(search)

    return (
        <SearchTable
            {...state}
            title={title}
            itemKey={({ item }) => item.id}
            columns={[
                { key: 'name', sortable: true },
                {
                    key: 'type',
                    cell: ({ item: { type } }) => snakeToTitle(type),
                    sortable: true,
                },
                {
                    key: 'state',
                    cell: ({ item: { state } }) => ListTag({ state }),
                    sortable: true,
                },
                {
                    key: 'users_count',
                    cell: ({ item }) => item.users_count?.toLocaleString(),
                },
                { key: 'created_at', sortable: true },
                { key: 'updated_at', sortable: true },
            ]}
            selectedRow={selectedRow}
            onSelectRow={list => handleOnSelectRow(list)}
            enableSearch
            tagEntity="lists"
        />
    )
}
