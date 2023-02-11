import clsx from 'clsx'
import { PropsWithChildren } from 'react'
import './Tile.css'

type TileProps = PropsWithChildren<{
    onClick?: () => void
    selected?: boolean
}> & JSX.IntrinsicElements['div']

export default function Tile({ onClick, selected = false, children, ...rest }: TileProps) {
    return <div {...rest} className={clsx(rest.className, 'ui-tile', { selected })} onClick={onClick} tabIndex={0}>{children}</div>
}

interface TileGridProps extends PropsWithChildren {
    numColumns?: number
}

export function TileGrid({ children, numColumns = 3 }: TileGridProps) {
    return <div className="ui-tile-grid" style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}>{children}</div>
}
