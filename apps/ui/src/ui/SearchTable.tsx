import { useState, ReactNode, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import useResolver from '../hooks/useResolver'
import { SearchParams, SearchResult } from '../types'
import { TagPicker } from '../views/settings/TagPicker'
import { DataTable, DataTableProps } from './DataTable'
import TextField from './form/TextField'
import Heading from './Heading'
import Pagination from './Pagination'

export interface SearchTableProps<T extends Record<string, any>> extends Omit<DataTableProps<T>, 'items'> {
    title?: ReactNode
    description?: ReactNode
    actions?: ReactNode
    results: SearchResult<T> | null
    params: SearchParams
    setParams: (params: SearchParams) => void
    enableSearch?: boolean
    tagEntity?: 'journeys' | 'lists' | 'users' | 'campaigns' // anything else we want to tag?
}

const DEFAULT_ITEMS_PER_PAGE = 10
const DEFAULT_PAGE = 0

const toTableParams = (searchParams: URLSearchParams) => {
    return {
        page: parseInt(searchParams.get('page') ?? '0'),
        itemsPerPage: parseInt(searchParams.get('itemsPerPage') ?? '10'),
        q: searchParams.get('q') ?? '',
        tag: searchParams.getAll('tag'),
    }
}

const fromTableParams = (params: SearchParams) => {
    return {
        page: params.page.toString(),
        itemsPerPage: params.itemsPerPage.toString(),
        q: params.q,
        tag: params.tag ?? [],
    }
}

export const useTableSearchParams = () => {
    const [searchParams, setSearchParams] = useSearchParams({
        page: DEFAULT_PAGE.toString(),
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE.toString(),
        q: '',
    })

    const setParams = useCallback<(params: SearchParams | ((prev: SearchParams) => SearchParams)) => void>(next => {
        typeof next === 'function'
            ? setSearchParams(prev => fromTableParams(next(toTableParams(prev))))
            : setSearchParams(fromTableParams(next))
    }, [setSearchParams])

    const str = searchParams.toString()

    return useMemo(() => [
        toTableParams(new URLSearchParams(str)),
        setParams,
    ] as const, [str, setParams])
}

/**
 * local state
 */
export function useSearchTableState<T>(loader: (params: SearchParams) => Promise<SearchResult<T> | null>) {

    const [params, setParams] = useState<SearchParams>({
        page: 0,
        itemsPerPage: 25,
        q: '',
    })

    const [results,, reload] = useResolver(useCallback(async () => await loader(params), [loader, params]))

    return {
        params,
        reload,
        results,
        setParams,
    }
}

export interface SearchTableQueryState<T> {
    results: SearchResult<T> | null
    params: SearchParams
    reload: () => Promise<void>
    setParams: (params: SearchParams) => void
}

/**
 * global query string state
 */
export function useSearchTableQueryState<T>(loader: (params: SearchParams) => Promise<SearchResult<T> | null>): SearchTableQueryState<T> {

    const [params, setParams] = useTableSearchParams()

    const [results,, reload] = useResolver(useCallback(async () => await loader(params), [loader, params]))

    return {
        params,
        reload,
        results,
        setParams,
    }
}

export function SearchTable<T extends Record<string, any>>({
    actions,
    description,
    enableSearch,
    params,
    results,
    setParams,
    tagEntity,
    title,
    ...rest
}: SearchTableProps<T>) {

    if (!results) {
        // TODO nice loading view
        return (
            <div>
                loading...
            </div>
        )
    }

    const filters: ReactNode[] = []

    if (enableSearch) {
        filters.push(
            <TextField
                key='search'
                name="search"
                value={params.q}
                placeholder="Search..."
                onChange={(value) => setParams({ ...params, q: value })}
            />,
        )
    }

    if (tagEntity) {
        filters.push(
            <TagPicker
                key='tags'
                entity={tagEntity}
                value={params.tag ?? []}
                onChange={tag => setParams({ ...params, tag })}
            />,
        )
    }

    return (
        <>
            {
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                (title || actions || description) && (
                    <Heading
                        size='h3'
                        title={title}
                        actions={actions}
                    >
                        {description}
                    </Heading>
                )
            }
            {
                filters.length > 0 && (
                    <div style={{ paddingBottom: '15px' }}>
                        {filters}
                    </div>
                )
            }
            <DataTable {...rest} items={results.results} />
            <Pagination
                page={results.page}
                total={results.pages}
                itemsPerPage={results.itemsPerPage}
                onChangePage={page => setParams({ ...params, page })} />
        </>
    )
}
