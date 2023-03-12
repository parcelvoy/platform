import { DropTargetMonitor } from 'react-dnd'
import { kebabToCamel } from '../utils'
import { Brick, Bricks, BrickType, BrickUUID, FlatBrick, FlatWall, Tree } from './Brick'
import { BrickConfig } from './BrickConfig'
import { BrickIndex } from './reducer'

export const buildWall = ({ children, ...flatBrick }: Brick): FlatWall => {
    const bricks: Bricks = {}
    const tree: Tree = {}

    bricks[flatBrick.uuid] = flatBrick

    if (!children) {
        tree[flatBrick.uuid] = []
        return { bricks, tree }
    }

    tree[flatBrick.uuid] = children.map(item => item.uuid)

    const flatChildren = children.reduce((acc, child) => {
        const { bricks, tree } = buildWall(child)
        acc.tree = { ...acc.tree, ...tree }
        acc.bricks = { ...acc.bricks, ...bricks }
        return acc
    }, { tree: {}, bricks: {} })

    return {
        bricks: { ...bricks, ...flatChildren.bricks },
        tree: { ...tree, ...flatChildren.tree },
    }
}

export const findInTree = (tree: Tree, uuid: BrickUUID): BrickIndex | undefined => {
    for (const parentUuid of Object.keys(tree)) {
        const parent = tree[parentUuid]
        const index = parent.findIndex((_uuid) => uuid === _uuid)
        if (index >= 0) return [parentUuid, index]
    }
}

export const allWithChildren = (tree: Tree, uuid: BrickUUID): BrickUUID[] => {
    const children = tree[uuid].reduce((acc: BrickUUID[], item) => acc.concat(allWithChildren(tree, item)), [])
    return [uuid, ...children]
}

export const firstKey = (obj: Record<any, any>, type?: BrickType) => {
    if (type) {
        return Object.values(obj).find(item => item.type === type)
    }
    return Object.values(obj)[0]
}

export const removeKeys = (keys: BrickUUID[], obj: any) => {
    const ret: {
        [K in keyof typeof obj]: (typeof obj)[K]
    } = {}
    let key: keyof typeof obj
    for (key in obj) {
        if (!(keys.includes(key))) {
            ret[key] = obj[key]
        }
    }
    return ret
}

export const heightBetweenCursorAndMiddle = (element: HTMLDivElement, monitor: DropTargetMonitor) => {
    const hoverBoundingRect = element.getBoundingClientRect()
    const hoverMiddleY = (hoverBoundingRect.bottom + hoverBoundingRect.top) / 2
    const clientOffset = monitor.getSourceClientOffset()
    const hoverClientY = clientOffset?.y ?? 0
    return hoverClientY - hoverMiddleY
}

export const attributesToReactProps = (brick: FlatBrick) => {

    const spec = BrickConfig[brick.type]

    const obj: {
        element: Record<string, any>
        container: Record<string, any>
    } = { element: {}, container: {} }

    const attributes = { ...spec.defaultAttributes, ...brick.attributes }
    const keys = Object.keys(attributes)
    for (const attribute of keys) {
        const bucket = spec.elementAttributes?.includes(attribute)
            ? obj.element
            : obj.container

        // Overrides
        if (attribute === 'background-url') {
            bucket.backgroundImage = `url("${attributes[attribute]}")`
            continue
        } else if (attribute === 'align') {
            bucket.textAlign = attributes[attribute]
        }

        bucket[kebabToCamel(attribute)] = attributes[attribute]
    }
    return obj
}
