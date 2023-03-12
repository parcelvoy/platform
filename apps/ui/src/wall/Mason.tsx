import data from './data'
import './Mason.css'
import { useReducer, useState } from 'react'
import { buildWall, findInTree, firstKey } from './utils'
import { ACTIONS, BrickIndex, reducer } from './reducer'
import { ContainerContextProvider } from './ContainerContext'
import BrickItemContainer from './BrickItemContainer'
import DraggableElement from './DraggableElement'
import { BrickUUID, FlatBrick } from './Brick'

export default function Mason() {

    const flatWall = buildWall(data)
    const [{ bricks, tree }, dispatch] = useReducer(reducer, flatWall)

    const [selected, setSelected] = useState<BrickUUID | undefined>()
    const find = (uuid: BrickUUID) => findInTree(tree, uuid)
    const move = (uuid: BrickUUID, destination: BrickIndex) => dispatch({ action: ACTIONS.MOVE, uuid, destination })
    const add = (parent: BrickUUID, child: FlatBrick) => dispatch({ action: ACTIONS.ADD, parent, child })
    const remove = (uuid: BrickUUID) => dispatch({ action: ACTIONS.REMOVE, uuid })

    return (
        <ContainerContextProvider
            value={{ bricks, tree, selected, setSelected, move, find, add, remove }}
        >
            <section className="mason">
                <section className="mason-drawer mason-options">
                    <h3>Sections</h3>
                    <div className="mason-options-grid">
                        <div className="mason-brick-option">
                            <span>1 Column</span>
                        </div>
                        <div className="mason-brick-option">
                            <span>2 Column</span>
                        </div>
                        <div className="mason-brick-option">
                            <span>3 Column</span>
                        </div>
                        <div className="mason-brick-option">
                            <span>4 Column</span>
                        </div>
                    </div>
                    <h3>Components</h3>
                    <div className="mason-brick-grid">
                        <DraggableElement uuid="new-text">
                            {({ ref, handleRef }) => (
                                <div className="mason-brick-option" ref={ref}>
                                    <div ref={handleRef}>Text</div>
                                </div>
                            )}
                        </DraggableElement>
                        <div className="mason-brick-option">
                            <span>Button</span>
                        </div>
                        <div className="mason-brick-option">
                            <span>Image</span>
                        </div>
                        <div className="mason-brick-option">
                            <span>Divider</span>
                        </div>
                    </div>
                </section>
                <section className="mason-builder">
                    <BrickItemContainer brick={firstKey(bricks, 'body')} />
                </section>
                <section className="mason-drawer mason-info">
                    <pre>
                        {JSON.stringify({ tree, bricks }, undefined, 4)}
                    </pre>
                </section>
            </section>
        </ContainerContextProvider>
    )
}
