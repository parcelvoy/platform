export type BrickType = 'wall' | 'body' | 'head' | 'button' | 'section' | 'column' | 'text' | 'heading' | 'image' | 'divider' | 'social' | 'raw'

export type BrickUUID = string
export interface Brick {
    uuid: BrickUUID
    type: BrickType
    attributes?: Record<string, any>
    children?: Brick[]
    value?: any
}

export type FlatBrick = Omit<Brick, 'children'>

export type Bricks = Record<BrickUUID, FlatBrick>
export type Tree = Record<BrickUUID, BrickUUID[]>
export interface FlatWall {
    bricks: Bricks
    tree: Tree
}

export type Wall = Brick

export interface WallState {
    past: Wall[]
    current?: Wall
    future: Wall[]
}

export const state: WallState = {
    past: [],
    current: undefined,
    future: [],
}
