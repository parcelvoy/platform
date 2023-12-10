import { CSSProperties, PropsWithChildren } from 'react'
import './Columns.css'
import clsx from 'clsx'

interface ColumnsProps {
    children?: React.ReactNode
}

interface ColumnProps extends PropsWithChildren<{ style?: CSSProperties }> {
    fullscreen?: boolean
}

export function Columns(props: ColumnsProps) {
    return (
        <div className="ui-columns">
            {props.children}
        </div>
    )
}

export function Column({ children, style, fullscreen }: ColumnProps) {
    return (
        <div className={clsx('ui-column', { fullscreen })} style={style}>
            {children}
        </div>
    )
}
