import clsx from 'clsx'
import { PropsWithChildren, ReactNode } from 'react'
import './Tile.css'

type TileProps = {
    onClick?: () => void
    selected?: boolean
    iconUrl?: string
    title: ReactNode
    size?: 'large' | 'regular'
    children: ReactNode
} & Omit<JSX.IntrinsicElements['div'], 'title'>

export default function Tile({
    onClick,
    selected = false,
    children,
    className,
    iconUrl,
    title,
    size = 'regular',
    ...rest
}: TileProps) {
    return (
        <div
            {...rest}
            className={clsx(className, 'ui-tile', { selected, interactive: onClick !== undefined }, size)}
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
