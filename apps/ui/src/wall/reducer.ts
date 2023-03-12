import { BrickUUID, FlatWall, FlatBrick, Tree, Bricks } from './Brick'
import { findInTree, allWithChildren, removeKeys } from './utils'

export enum ACTIONS {
    MOVE = 'MOVE',
    ADD = 'ADD',
    REMOVE = 'REMOVE',
}

export type BrickIndex = [BrickUUID, number]

type Action = {
    action: ACTIONS.MOVE
    uuid: BrickUUID
    destination: BrickIndex
}
| {
    action: ACTIONS.ADD
    parent: BrickUUID
    child: FlatBrick
}
| {
    action: ACTIONS.REMOVE
    uuid: BrickUUID
}

export const reducer = (state: FlatWall, action: Action): { tree: Tree, bricks: Bricks } => {
    const { bricks, tree } = state
    if (action.action === ACTIONS.MOVE) {
        const { uuid, destination } = action
        const [toParent, toIndex] = destination

        const from = findInTree(tree, uuid)

        // If the target element can't be found in tree
        // add to the tree if it exists as a brick
        if (!from) {
            const brick = bricks[uuid]
            if (!brick) return state

            const subTreeFrom = Array.from(tree[toParent])
            subTreeFrom.splice(toIndex, 0, uuid)
            return {
                ...state,
                tree: {
                    ...tree,
                    [toParent]: subTreeFrom,
                },
            }
        }

        const [fromParent, fromIndex] = from

        // If indexes and parents match, break
        if (fromParent === toParent && fromIndex === toIndex) {
            return state
        }

        if (fromParent === toParent) {
            const subTreeFrom = Array.from(tree[fromParent])
            const [element] = subTreeFrom.splice(fromIndex, 1)
            subTreeFrom.splice(toIndex, 0, element)
            return {
                ...state,
                tree: {
                    ...tree,
                    [fromParent]: subTreeFrom,
                },
            }
        }

        const subTreeFrom = Array.from(tree[fromParent])
        const subTreeTo = Array.from(tree[toParent] || [])
        const element = subTreeFrom[fromIndex]
        subTreeFrom.splice(fromIndex, 1)
        subTreeTo.splice(toIndex, 0, element)
        return {
            ...state,
            tree: {
                ...tree,
                [fromParent]: subTreeFrom,
                [toParent]: subTreeTo,
            },
        }
    } else if (action.action === ACTIONS.ADD) {
        const { parent, child } = action
        return {
            bricks: {
                ...bricks,
                [child.uuid]: child,
            },
            tree: {
                ...tree,
                [child.uuid]: [],
                [parent]: [...(tree[parent] || []), child.uuid],
            },
        }
    } else if (action.action === ACTIONS.REMOVE) {
        const { uuid } = action

        const entry = findInTree(tree, uuid)
        if (!entry) return state
        const [parent, index] = entry

        const removedBricks = allWithChildren(tree, uuid)
        const subTree = Array.from(tree[parent])
        subTree.splice(index, 1)

        return {
            bricks: removeKeys(removedBricks, bricks),
            tree: {
                ...tree,
                [parent]: subTree,
            },
        }
    }

    return state
}
