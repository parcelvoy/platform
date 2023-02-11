import clsx from 'clsx'
import { PropsWithChildren } from 'react'

type StackProps = PropsWithChildren<{
    vertical?: boolean
}>

export default function Stack({ children, vertical }: StackProps) {
    return (
        <div className={clsx('ui-stack', vertical && 'ui-stack-vertical')}>
            {children}
        </div>
    )
}
