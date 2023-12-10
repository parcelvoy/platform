import { PropsWithChildren, ReactNode } from 'react'
import Heading from './Heading'
import clsx from 'clsx'

type PageHeaderProps = PropsWithChildren<{
    title: ReactNode
    actions?: ReactNode
    desc?: ReactNode
    banner?: ReactNode
    fullscreen?: boolean
}>

export default function PageContent({ actions, children, desc, title, banner, fullscreen = false }: PageHeaderProps) {
    return (
        <div className={clsx('page-content', { fullscreen })}>
            {banner && <div className="page-banner">{banner}</div>}
            <Heading title={title} actions={actions}>{desc}</Heading>
            {children}
        </div>
    )
}
