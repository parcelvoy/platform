import React, { ReactNode, useRef } from 'react'
import { ConnectDragSource, useDrag, useDrop } from 'react-dnd'
import { useContainerContext } from './ContainerContext'
import { BrickIndex } from './reducer'
import { heightBetweenCursorAndMiddle } from './utils'

interface DraggableChildProps {
    ref: React.MutableRefObject<null>
    handleRef: ConnectDragSource
    isDragging: boolean
}

interface DraggableProps {
    uuid: string
    index?: number
    parents?: string[]
    children: (props: DraggableChildProps) => ReactNode
}

export interface DragItem {
    index: number
    id: string
    type: string
}

export default function DraggableElement({
    uuid,
    parents = [],
    index = 0,
    children,
}: DraggableProps) {
    const refPreview = useRef(null)
    const { move, find } = useContainerContext()
    const [{ isDragging }, drag, preview] = useDrag({
        type: 'brick', // TODO: Use actual brick types
        item: { id: uuid, index },
        collect: (monitor) => ({
            isDragging: monitor.getItemType() === 'brick' && monitor.getItem().id === uuid,
        }),
    })
    const [, drop] = useDrop({
        accept: 'brick',
        hover: (element: DragItem, monitor) => {
            // Do nothing if the preview is not ready or if nested targets are being hovered
            // https://react-dnd.github.io/react-dnd/examples/nesting/drop-targets
            if (!refPreview.current || !monitor.isOver({ shallow: true })) {
                return
            }

            const parent = parents[parents.length - 1]
            const isDescendant = parents.includes(element.id)

            // It is not possible to swap an element if
            // - it is the element itself
            // - the element is one of the parents of the current element
            if (element.id === uuid || isDescendant) {
                return
            }

            // When the elements have the same parent
            // We perform the move when the mouse has crossed half of the element height
            const elementMatch = find(element.id)
            if (!elementMatch) return
            const [elementParent, elementIndex] = elementMatch
            const height = heightBetweenCursorAndMiddle(refPreview.current, monitor)
            let destination: BrickIndex
            if (elementParent === parent) {
                // When dragging downwards, only move when the cursor is below 50%
                // When dragging upwards, only move when the cursor is above 50%
                if (
                    (elementIndex < index && height < 0)
                    || (elementIndex > index && height > 0)
                ) {
                    return
                }
                destination = [parent, index]
            } else {
                // TODO : Explain this use case
                // Not sure if it's a generic "else" case
                // It in order to handle the case when a lot is drag out from another
                // The event is triggered and the height of the main element is with the drag element
                // So we have to remove half the height of the preview (but not so easy to access)
                destination = [parent, index]
            }

            move(element.id, destination)
        },
    })

    drop(preview(refPreview))
    return (
        <>
            {children({ ref: refPreview, handleRef: drag, isDragging })}
        </>
    )
}
