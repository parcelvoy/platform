import clsx from 'clsx'
import { Key, ReactNode, useContext } from 'react'
import { formatDate, snakeToTitle } from '../utils'
import './DataTable.css'
import { PreferencesContext } from './PreferencesContext'

type DataTableResolver<T, R> = (args: {
    item: T
}) => R

export interface DataTableCol<T> {
    key: string
    title?: ReactNode
    cell?: DataTableResolver<T, ReactNode>
}

export interface DataTableProps<T, C = {}> {
    columns: Array<DataTableCol<T>>
    context?: C
    items: T[]
    itemKey?: DataTableResolver<T, Key>
    emptyMessage?: ReactNode
    selectedRow?: Key
    onSelectRow?: (row: T) => void
}

export function DataTable<T>({
    columns,
    emptyMessage = 'No Results',
    items,
    itemKey,
    selectedRow,
    onSelectRow,
}: DataTableProps<T>) {
    const [preferences] = useContext(PreferencesContext)
    return (
        <div className="ui-table">
            <div className="table-header">
                {
                    columns.map(col => (
                        <div className="table-header-cell" key={col.key}>
                            {col.title ?? snakeToTitle(col.key)}
                        </div>
                    ))
                }
            </div>
            {
                (items.length > 0)
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
                                        if (!col.cell
                                            && col.key.endsWith('_at')
                                            && value
                                        ) {
                                            value = formatDate(preferences, value)
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
                    : (
                        <div className='table-cell'>
                            {emptyMessage}
                        </div>
                    )
            }
        </div>
    )
}
