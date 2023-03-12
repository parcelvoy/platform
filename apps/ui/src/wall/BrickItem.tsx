import clsx from 'clsx'
import { MutableRefObject, MouseEvent, useState, useEffect, useRef } from 'react'
import { createUuid } from '../utils'
import { BrickUUID, FlatBrick } from './Brick'
import BrickItemContainer from './BrickItemContainer'
import { useContainerContext } from './ContainerContext'
import DraggableElement from './DraggableElement'
import { attributesToReactProps } from './utils'
import { init, exec, PellElement } from 'pell'
import 'pell/dist/pell.css'
import { BoldIconSvg, DuplicateIcon, ItalicIconSvg, LinkIconSvg, StrikeIconSvg, TrashIcon, UnderlineIconSvg } from '../ui/icons'

interface BrickItemProps {
    brick: FlatBrick
    index: number
    parents: BrickUUID[]
}

interface BrickValueProps {
    value: string
    onChange?: (value: string) => void
}

const BrickValue = ({ value, onChange }: BrickValueProps) => {
    const ref = useRef<HTMLDivElement | null>(null)
    const pellRef = useRef<PellElement | null>(null)
    const changeRef = useRef(onChange)
    changeRef.current = onChange

    useEffect(() => {
        if (ref.current && !pellRef.current) {
            pellRef.current = init({
                element: ref.current,
                onChange: html => changeRef.current?.(html),
                classes: {
                    actionbar: 'brick-menu top',
                    button: 'brick-menu-button',
                    content: 'pell-content',
                    selected: 'selected',
                },
                actions: [
                    {
                        name: 'bold',
                        icon: BoldIconSvg,
                        result: () => exec('bold'),
                    },
                    {
                        name: 'italic',
                        icon: ItalicIconSvg,
                        result: () => exec('italic'),
                    },
                    {
                        name: 'underline',
                        icon: UnderlineIconSvg,
                        result: () => exec('underline'),
                    },
                    {
                        name: 'strikethrough',
                        icon: StrikeIconSvg,
                        result: () => exec('strikethrough'),
                    },
                    {
                        name: 'link',
                        icon: LinkIconSvg,
                        result: () => {
                            const url = window.prompt('Enter the link URL')
                            if (url) exec('createLink', url)
                        },
                    },
                ],
            })
        }
    }, [])

    useEffect(() => {
        if (pellRef.current) {
            pellRef.current.content.innerHTML = `<div>${value}</div>`
        }
    }, [value])

    return <div ref={ref} className="pell-editor" />
}

export default function BrickItem({ brick, index, parents }: BrickItemProps) {
    const { uuid, type } = brick
    const { remove, add, selected, setSelected } = useContainerContext()
    const [isHovering, setIsHovering] = useState(false)
    const parent = parents[parents.length - 1]
    const attributes = attributesToReactProps(brick)

    const handleRemove = () => remove(uuid)
    const handleDuplicate = () => {
        const newBrick = {
            ...brick,
            uuid: createUuid(),
        }
        add(parent, newBrick)
    }
    const handleHover = (
        event: MouseEvent,
        ref: MutableRefObject<null>,
        isHovering: boolean,
    ) => {
        event.stopPropagation()
        if (event.currentTarget === ref.current) {
            setIsHovering(isHovering)
        }
    }

    return (
        <DraggableElement
            uuid={uuid}
            index={index}
            parents={parents}
        >
            {({ ref, handleRef, isDragging }) => (
                <section
                    className={
                        clsx('brick', type, {
                            isDragging,
                            isHovering,
                            isSelected: selected === uuid,
                        })
                    }
                    style={attributes.container}
                    onMouseOver={(e) => handleHover(e, ref, true)}
                    onMouseOut={(e) => handleHover(e, ref, false)}
                    onClickCapture={() => setSelected(uuid)}
                    ref={ref}>
                    <div className="brick-menu right">
                        <button className="brick-option" onClick={handleDuplicate}><DuplicateIcon /></button>
                        <button className="brick-option" onClick={handleRemove}><TrashIcon /></button>
                    </div>
                    <div className="brick-inner" style={attributes.element}>
                        {brick.value
                            ? <BrickValue value={brick.value} />
                            : <BrickItemContainer brick={brick} parents={parents} />
                        }
                    </div>
                    <div className="brick-handle" ref={handleRef} />
                </section>
            )}
        </DraggableElement>
    )
}
