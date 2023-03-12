import clsx from 'clsx'
import { PropsWithChildren, ReactNode } from 'react'
import './Tile.css'

type TileProps = PropsWithChildren<{
    onClick?: () => void
    selected?: boolean
    iconUrl?: string
    title: ReactNode
}> & JSX.IntrinsicElements['div']

export default function Tile({
    onClick,
    selected = false,
    children,
    className,
    iconUrl,
    title,
    ...rest
}: TileProps) {
    return (
        <div
            {...rest}
            className={clsx(className, 'ui-tile', { selected })}
            onClick={onClick}
            tabIndex={0}
        >
            {
                iconUrl && (
                    <img
                        src={iconUrl}
                        className="ui-tile-icon"
                        aria-hidden
                    />
                )
            }
            <div className="ui-tile-text">
                <h5>{title}</h5>
                <p>{children}</p>
            </div>
        </div>
    )
}

interface TileGridProps extends PropsWithChildren {
    numColumns?: number
}

export function TileGrid({ children, numColumns = 3 }: TileGridProps) {
    return <div className="ui-tile-grid" style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}>{children}</div>
}
