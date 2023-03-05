import { PropsWithChildren, ReactNode } from 'react'
import Heading from './Heading'

type PageHeaderProps = PropsWithChildren<{
    title: ReactNode
    actions?: ReactNode
    desc?: ReactNode
}>

export default function PageContent({ actions, children, desc, title }: PageHeaderProps) {
    return (
        <div className="page-content">
            <Heading title={title} actions={actions}>{desc}</Heading>
            {children}
        </div>
    )
}
