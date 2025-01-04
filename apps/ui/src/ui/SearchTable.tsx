import { useState, ReactNode, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounceControl, useResolver } from '../hooks'
import { SearchParams, SearchResult } from '../types'
import { prune } from '../utils'
import { TagPicker } from '../views/settings/TagPicker'
import { DataTable, DataTableProps } from './DataTable'
import TextInput from './form/TextInput'
import Heading from './Heading'
import { SearchIcon } from './icons'
import Pagination from './Pagination'
import Stack from './Stack'
import { useTranslation } from 'react-i18next'

export interface SearchTableProps<T extends Record<string, any>> extends Omit<DataTableProps<T>, 'items'> {
    title?: ReactNode
    description?: ReactNode
    actions?: ReactNode
    results: SearchResult<T> | null
    params: SearchParams
    setParams: (params: SearchParams) => void
    enableSearch?: boolean
    searchPlaceholder?: string
    tagEntity?: 'journeys' | 'lists' | 'users' | 'campaigns' // anything else we want to tag?
}

const DEFAULT_ITEMS_PER_PAGE = 25
const DEFAULT_PAGE = 0

const toTableParams = (searchParams: URLSearchParams): SearchParams => {
    return {
        cursor: searchParams.get('cursor') ?? undefined,
        page: searchParams.get('page') === 'prev' ? 'prev' : 'next',
        limit: parseInt(searchParams.get('limit') ?? '25'),
        q: searchParams.get('q') ?? undefined,
        tag: searchParams.getAll('tag'),
        sort: searchParams.get('sort') ?? undefined,
        direction: searchParams.get('direction') ?? undefined,
    }
}

const fromTableParams = (params: SearchParams): Record<string, string> => {
    return prune({
        cursor: params.cursor,
        page: params.page,
        limit: params.limit.toString(),
        q: params.q,
        tag: params.tag ?? [],
        sort: params.sort,
        direction: params.direction,
    })
}

export const useTableSearchParams = () => {
    const [searchParams, setSearchParams] = useSearchParams({
        page: DEFAULT_PAGE.toString(),
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE.toString(),
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
export function useSearchTableState<T>(loader: (params: SearchParams) => Promise<SearchResult<T> | null>, initialParams?: Partial<SearchParams>) {

    const [params, setParams] = useState<SearchParams>({
        limit: 25,
        q: '',
        ...initialParams ?? {},
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
    searchPlaceholder,
    setParams,
    tagEntity,
    title,
    ...rest
}: SearchTableProps<T>) {
    const { t } = useTranslation()
    const [search, setSearch] = useDebounceControl(params.q ?? '', q => setParams({ ...params, q }))
    const columnSort = params.sort
        ? { sort: params.sort, direction: params.direction ?? 'asc' }
        : undefined
    const filters: ReactNode[] = []

    if (enableSearch) {
        filters.push(
            <TextInput
                key="search"
                name="search"
                value={search}
                placeholder={searchPlaceholder ?? t('search')}
                onChange={setSearch}
                hideLabel={true}
                icon={<SearchIcon />}
            />,
        )
    }

    if (tagEntity) {
        filters.push(
            <TagPicker
                key="tags"
                entity={tagEntity}
                value={params.tag ?? []}
                onChange={tag => setParams({ ...params, tag })}
                placeholder={t('filter')}
            />,
        )
    }

    return (
        <>
            {
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                (title || actions || description) && (
                    <Heading
                        size="h3"
                        title={title}
                        actions={actions}
                    >
                        {description}
                    </Heading>
                )
            }
            {
                filters.length > 0 && (
                    <Stack>
                        {filters}
                    </Stack>
                )
            }
            <DataTable {...rest}
                items={results?.results}
                isLoading={!results}
                columnSort={columnSort}
                onColumnSort={(onSort) => {
                    const { sort, direction, ...prevParams } = params
                    setParams({ ...prevParams, ...onSort })
                }} />
            {results && (
                <div>
                    <Pagination
                        nextCursor={results.nextCursor}
                        prevCursor={results.prevCursor}
                        onPrev={cursor => setParams({ ...params, cursor, page: 'prev' })}
                        onNext={cursor => setParams({ ...params, cursor, page: 'next' })} />
                </div>
            )}
        </>
    )
}
