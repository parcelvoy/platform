import clsx from 'clsx'
import { CSSProperties, PropsWithChildren } from 'react'
import './Stack.css'

type StackProps = PropsWithChildren<{
    className?: string
    style?: CSSProperties
    vertical?: boolean
}>

export default function Stack({ children, className, style, vertical }: StackProps) {
    return (
        <div className={clsx('ui-stack', vertical && 'ui-stack-vertical', className)} style={style}>
            {children}
        </div>
    )
}
