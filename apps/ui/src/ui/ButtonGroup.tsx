import clsx from 'clsx'
import { CSSProperties, PropsWithChildren } from 'react'
import './ButtonGroup.css'

type ButtonGroupProps = PropsWithChildren<{
    className?: string
    style?: CSSProperties
}>

export default function ButtonGroup({ children, className, style }: ButtonGroupProps) {
    return (
        <div className={clsx('ui-button-group', className)} style={style}>
            {children}
        </div>
    )
}
