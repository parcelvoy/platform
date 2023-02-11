import './Heading.css'

interface HeadingProps {
    title: React.ReactNode
    size?: 'h2' | 'h3' | 'h4'
    actions?: React.ReactNode
    children?: React.ReactNode
}

export default function Heading({ title, actions, children, size = 'h2' }: HeadingProps) {
    const HeadingTitle = `${size}` as keyof JSX.IntrinsicElements
    return (
        <div className={`heading heading-${size}`}>
            <div className="heading-text">
                <HeadingTitle>{title}</HeadingTitle>
                {children && <div className="desc">{children}</div>}
            </div>
            {actions && <div className="actions">{actions}</div>}
        </div>
    )
}
