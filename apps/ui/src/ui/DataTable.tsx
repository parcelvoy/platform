import clsx from 'clsx'
import { Key, ReactNode, useContext } from 'react'
import { formatDate, snakeToTitle } from '../utils'
import Button from './Button'
import './DataTable.css'
import { CheckIcon, ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon, CloseIcon } from './icons'
import { PreferencesContext } from './PreferencesContext'

type DataTableResolver<T, R> = (args: {
    item: T
}) => R

export interface DataTableCol<T> {
    key: string
    title?: ReactNode
    cell?: DataTableResolver<T, ReactNode>
    sortable?: boolean
    sortKey?: string
}

export interface ColSort {
    sort: string
    direction: string
}

interface HeaderCellProps<T> {
    col: DataTableCol<T>
    columnSort?: ColSort
    onColumnSort?: (sort?: ColSort) => void
}

export function HeaderCell<T>({ col, columnSort, onColumnSort }: HeaderCellProps<T>) {
    const { key, title, sortable, sortKey } = col
    const sort = sortKey ?? key
    const handleSort = () => {
        if (columnSort?.sort !== sort) {
            onColumnSort?.({ sort, direction: 'asc' })
        } else if (columnSort?.direction === 'desc') {
            onColumnSort?.()
        } else {
            onColumnSort?.({ sort, direction: 'desc' })
        }
    }
    return <div className="table-header-cell">
        <div className="header-cell-content">
            <span>{title ?? snakeToTitle(key)}</span>
            {sortable && (
                <Button
                    size="tiny"
                    variant="secondary"
                    onClick={() => handleSort()}
                    icon={
                        columnSort?.sort === sort
                            ? columnSort?.direction === 'asc'
                                ? <ChevronUpIcon />
                                : <ChevronDownIcon />
                            : <ChevronUpDownIcon />
                    } />
            )}
        </div>
    </div>
}

export interface DataTableProps<T, C = {}> {
    columns: Array<DataTableCol<T>>
    context?: C
    items?: T[]
    itemKey?: DataTableResolver<T, Key>
    emptyMessage?: ReactNode
    selectedRow?: Key
    onSelectRow?: (row: T) => void
    columnSort?: ColSort
    onColumnSort?: (sort?: ColSort) => void
    isLoading?: boolean
}

export function DataTable<T>({
    columns,
    emptyMessage = 'No Results',
    items,
    itemKey,
    selectedRow,
    onSelectRow,
    columnSort,
    onColumnSort,
    isLoading = false,
}: DataTableProps<T>) {
    const [preferences] = useContext(PreferencesContext)
    return (
        <div className="ui-table">
            <div className="table-header">
                {
                    columns.map(col => (
                        <HeaderCell<T>
                            key={col.key}
                            col={col}
                            onColumnSort={onColumnSort}
                            columnSort={columnSort} />
                    ))
                }
            </div>
            {
                (items && items.length > 0)
                    ? items.map(item => {

                        const args = { item }
                        const key = itemKey ? itemKey(args) : (item as any).id

                        return (
                            <div
                                className={clsx(
                                    'table-row',
                                    onSelectRow ? ' table-row-interactive' : '',
                                    selectedRow === key ? ' table-row-selected' : '',
                                )}
                                key={key}
                                onClick={() => onSelectRow?.(item)}
                            >
                                {
                                    columns.map(col => {
                                        let value: any = col.cell
                                            ? col.cell(args)
                                            : item[col.key as keyof T]
                                        if (!col.cell) {
                                            if ((col.key.endsWith('_at') || col.key.endsWith('_until'))
                                                && (typeof value === 'string' || typeof value === 'number')) {
                                                value = formatDate(preferences, value, 'Pp')
                                            }
                                            if (typeof value === 'boolean') {
                                                value = value ? <CheckIcon /> : <CloseIcon />
                                            }
                                        }
                                        return (
                                            <div className="table-cell" key={col.key}>
                                                {value ?? <>&#8211;</>}
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        )
                    })
                    : isLoading
                        ? Array.from({ length: 3 }, (x, i) => (
                            <div className="table-row loading" key={i}>
                                {
                                    columns.map(col => (
                                        <div className="table-cell" key={col.key}>
                                            <div className="loader"></div>
                                        </div>
                                    ))
                                }
                            </div>
                        ))
                        : <div className="table-row">
                            <div className="table-cell">
                                {emptyMessage}
                            </div>
                        </div>
            }
        </div>
    )
}
