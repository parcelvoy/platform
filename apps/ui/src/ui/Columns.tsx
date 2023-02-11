import { CSSProperties, PropsWithChildren } from 'react'
import './Columns.css'

interface ColumnProps {
    children?: React.ReactNode
}

export function Columns(props: ColumnProps) {
    return (
        <div className="ui-columns">
            {props.children}
        </div>
    )
}

export function Column({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) {
    return (
        <div className="ui-column" style={style}>
            {children}
        </div>
    )
}
