import { useRef } from 'react'
import { useDrop } from 'react-dnd'
import { useContainerContext } from './ContainerContext'
import { heightBetweenCursorAndMiddle } from './utils'
import { BrickType, BrickUUID, FlatBrick } from './Brick'
import { DragItem } from './DraggableElement'
import { BrickIndex } from './reducer'
import BrickItem from './BrickItem'

interface DroppableZoneProps {
    type: BrickType
    parents: BrickUUID[]
    elements: FlatBrick[]
}

export default function DroppableZone({ parents, elements, ...props }: DroppableZoneProps) {
    const refDrop = useRef(null)
    const { move, find } = useContainerContext()
    const [, drop] = useDrop({
        accept: 'brick', // TODO: Enable this to reduce types that can drop
        hover: (element: DragItem, monitor) => {
            // Do nothing if the drop zone is not ready or if nested targets are being hovered
            // https://react-dnd.github.io/react-dnd/examples/nesting/drop-targets
            if (!refDrop.current || !monitor.isOver({ shallow: true })) {
                return
            }

            const parent = parents[parents.length - 1]
            const elementMatch = find(element.id)
            if (!elementMatch) return
            const [elementParent] = elementMatch
            const isDescendant = parents.includes(element.id)

            // It is not possible to move an element in this zone if
            // - it is already in this zone (they have the same parent)
            // - the element is one of the parents of the current zone
            if (parent === elementParent || isDescendant) {
                return
            }

            // TODO : improve to put the element at the right place, not only first or last position
            // If we drop the element from the top, it is put on the first position
            // If we drop the element from the bottom, it is put on the last position
            const height = heightBetweenCursorAndMiddle(refDrop.current, monitor)
            const index = height < 0 ? 0 : elements.length

            const destination: BrickIndex = [parent, index]
            move(element.id, destination)
        },
    })

    drop(refDrop)
    return (
        <div ref={refDrop} className="brick-children" {...props}>
            {elements.map((element, index) => (
                <BrickItem
                    key={element.uuid}
                    index={index}
                    parents={parents}
                    brick={element} />
            ))}
        </div>
    )
}
