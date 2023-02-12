import { PropsWithChildren } from 'react'
import './Tag.css'

export type TagVariant = 'info' | 'plain' | 'success' | 'error' | 'warn'

type TagProps = PropsWithChildren<{
    onClick?: () => void
    children?: React.ReactNode
    variant?: TagVariant
}>

export default function Tag({ variant = 'info', children, onClick }: TagProps) {
    return (
        <div className={`ui-tag ${variant}`}>
            {children}
            {onClick && <div className="tag-close bi-x" onClick={onClick} /> }
        </div>
    )
}

export function TagGroup({ children }: PropsWithChildren) {
    return <div className="ui-tag-group">{children}</div>
}
