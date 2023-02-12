import './InfoTable.css'
import { ReactNode } from 'react'
import { snakeToTitle } from '../utils'

interface InfoTableProps {
    rows: Record<string, ReactNode>
    direction?: 'horizontal' | 'vertical'
}

export function InfoTable({ rows, direction = 'vertical' }: InfoTableProps) {
    return (
        <div className={`ui-info-table ${direction}`}>
            {Object.keys(rows).map(item => {
                let value = rows[item]
                if (typeof value === 'boolean') {
                    value = value ? 'Yes' : 'No'
                } else if (!value) {
                    value = <>&#8211;</>
                }

                return (
                    <div className="info-row" key={item}>
                        <span className="info-label">{snakeToTitle(item)}</span>
                        <span className="info-value">{value}</span>
                    </div>
                )
            })}
        </div>
    )
}
