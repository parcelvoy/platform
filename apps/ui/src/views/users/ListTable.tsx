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
    onSelectRow?: (id: number) => void
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
    function handleOnSelectRow(id: number) {
        onSelectRow ? onSelectRow(id) : route(`lists/${id}`)
    }

    const state = useSearchTableState(search)

    return (
        <SearchTable
            {...state}
            title={title}
            itemKey={({ item }) => item.id}
            columns={[
                { key: 'name' },
                {
                    key: 'type',
                    cell: ({ item: { type } }) => snakeToTitle(type),
                },
                {
                    key: 'state',
                    cell: ({ item: { state } }) => ListTag({ state }),
                },
                { key: 'users_count' },
                { key: 'created_at' },
                { key: 'updated_at' },
            ]}
            selectedRow={selectedRow}
            onSelectRow={({ id }) => handleOnSelectRow(id)}
            enableSearch
            tagEntity="lists"
        />
    )
}
