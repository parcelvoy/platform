import { createContext, useContext } from 'react'
import { BrickUUID, Bricks, Tree, FlatBrick } from './Brick'
import { BrickIndex } from './reducer'

interface MasonActions {
    bricks: Bricks
    tree: Tree
    selected: BrickUUID | undefined
    setSelected: (uuid: BrickUUID | undefined) => void
    find: (uuid: BrickUUID) => BrickIndex | undefined
    move: (uuid: BrickUUID, destination: BrickIndex) => void
    add: (parent: BrickUUID, child: FlatBrick) => void
    remove: (uuid: BrickUUID) => void
}

const ContainerContext = createContext<MasonActions>({} as unknown as MasonActions)

export const ContainerContextProvider = ContainerContext.Provider

export const useContainerContext = () => {
    return useContext(ContainerContext)
}
