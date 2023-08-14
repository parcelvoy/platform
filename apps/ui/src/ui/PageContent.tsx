import { PropsWithChildren, ReactNode } from 'react'
import Heading from './Heading'

type PageHeaderProps = PropsWithChildren<{
    title: ReactNode
    actions?: ReactNode
    desc?: ReactNode
    banner?: ReactNode
}>

export default function PageContent({ actions, children, desc, title, banner }: PageHeaderProps) {
    return (
        <div className="page-content">
            {banner && <div className="page-banner">{banner}</div>}
            <Heading title={title} actions={actions}>{desc}</Heading>
            {children}
        </div>
    )
}
