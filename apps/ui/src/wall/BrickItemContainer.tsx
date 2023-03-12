import { BrickUUID, FlatBrick } from './Brick'
import { useContainerContext } from './ContainerContext'
import DroppableZone from './DroppableZone'

interface BrickItemContainerProps {
    brick: FlatBrick
    parents?: BrickUUID[]
}

export default function BrickItemContainer({ brick: { uuid, type }, parents: inheritParents }: BrickItemContainerProps) {
    const { bricks, tree } = useContainerContext()

    const items = tree[uuid].map(id => bricks[id])
    const parents = (inheritParents ?? []).concat([uuid])
    return <DroppableZone type={type} elements={items} parents={parents} />
}
