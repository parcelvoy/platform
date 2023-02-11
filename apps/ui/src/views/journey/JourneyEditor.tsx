import { createElement, DragEventHandler, memo, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactFlow, {
    addEdge,
    Background,
    Connection,
    Controls,
    Edge,
    EdgeLabelRenderer,
    EdgeProps,
    EdgeTypes,
    getBezierPath,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    NodeProps,
    NodeTypes,
    Position,
    ReactFlowInstance,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from 'reactflow'
import { JourneyContext, ProjectContext } from '../../contexts'
import { PreferencesContext } from '../../ui/PreferencesContext'
import { createComparator, createUuid, formatDate } from '../../utils'
import * as journeySteps from './steps/index'
import clsx from 'clsx'
import api from '../../api'
import { JourneyStep, JourneyStepMap, JourneyStepType } from '../../types'

import './JourneyEditor.css'
import 'reactflow/dist/style.css'
import Button from '../../ui/Button'

const getStepType = (type: string) => (type ? journeySteps[type as keyof typeof journeySteps] as JourneyStepType : null) ?? null

function JourneyStepNode({
    id,
    data: {
        type: typeName,
        data,
    } = {},
    selected,
}: NodeProps) {

    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)
    const { setNodes } = useReactFlow()

    const onDataChange = useCallback((data: any) => {
        setNodes(nds => nds.map(n => n.id === id
            ? {
                ...n,
                data: {
                    ...n.data,
                    data,
                },
            }
            : n))
    }, [id, setNodes])

    const type = getStepType(typeName)

    if (!type) {
        return (
            <div>
                invalid step type!
            </div>
        )
    }

    return (
        <>
            {
                type.category !== 'entrance' && (
                    <Handle type='target' position={Position.Top} id={'t-' + id} />
                )
            }
            <div className={clsx('journey-step', type.category, selected && 'selected')}>
                <div className="journey-step-header">
                    <i className={clsx('step-header-icon', type.icon)} />
                    <h4 className="step-header-title">{type.name}</h4>
                </div>
                {
                    type.Edit && (
                        <div className='journey-step-body'>
                            {
                                createElement(type.Edit, {
                                    value: data,
                                    onChange: onDataChange,
                                    project,
                                    journey,
                                })
                            }
                        </div>
                    )
                }
            </div>
            <Handle type='source' position={Position.Bottom} id={'s-' + id} />
        </>
    )
}

function JourneyStepEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    source,
    data = {},
}: EdgeProps) {

    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    const { getNode, setEdges } = useReactFlow()

    const onChangeData = useCallback((data: any) => setEdges(edges => edges.map(e => e.id === id ? { ...e, data } : e)), [id, setEdges])

    const sourceNode = getNode(source)
    const sourceType = getStepType(sourceNode?.data?.type)

    return (
        <>
            <path id={id} className="react-flow__edge-path" d={edgePath} />
            {
                !!(sourceNode && sourceType?.EditEdge) && (
                    <EdgeLabelRenderer>
                        <div
                            style={{
                                position: 'absolute',
                                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            }}
                            className="nodrag nopan journey-step-edge"
                        >
                            {
                                createElement(sourceType.EditEdge, {
                                    value: data,
                                    onChange: onChangeData,
                                    stepData: sourceNode.data.data,
                                    journey,
                                    project,
                                })
                            }
                        </div>
                    </EdgeLabelRenderer>
                )
            }
        </>
    )
}

const nodeTypes: NodeTypes = {
    step: memo(JourneyStepNode),
}

const edgeTypes: EdgeTypes = {
    step: memo(JourneyStepEdge),
}

const DATA_FORMAT = 'application/parcelvoy-journey-step'

const STEP_STYLE = 'smoothstep'

function stepsToNodes(stepMap: JourneyStepMap) {

    const nodes: Node[] = []
    const edges: Edge[] = []

    for (const [id, { x, y, type, data, children }] of Object.entries(stepMap)) {
        nodes.push({
            id,
            position: {
                x,
                y,
            },
            type: 'step',
            data: {
                type,
                data,
            },
        })
        children?.forEach(({ uuid, data }) => edges.push({
            id: 'e-' + id + '-' + uuid,
            source: id,
            sourceHandle: 's-' + id,
            target: uuid,
            targetHandle: 't-' + uuid,
            data,
            type: STEP_STYLE,
            markerEnd: {
                type: MarkerType.ArrowClosed,
            },
        }))
    }

    return { nodes, edges }
}

function nodesToSteps(nodes: Node[], edges: Edge[]) {
    return nodes.reduce<JourneyStepMap>((a, {
        id,
        data: {
            type,
            data = {},
        },
        position: {
            x,
            y,
        },
    }) => {
        a[id] = {
            type,
            data,
            x,
            y,
            children: edges
                .filter(e => e.source === id)
                .map(({ data = {}, target }) => ({
                    uuid: target,
                    data,
                })),
        }
        return a
    }, {})
}

export default function JourneyEditor() {

    const [flowInstance, setFlowInstance] = useState<null | ReactFlowInstance>(null)
    const wrapper = useRef<HTMLDivElement>(null)

    const [preferences] = useContext(PreferencesContext)
    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    const loadSteps = useCallback(async () => {

        const steps = await api.journeys.steps.get(project.id, journey.id)

        const { edges, nodes } = stepsToNodes(steps)

        setNodes(nodes)
        setEdges(edges)

    }, [project, journey])

    useEffect(() => {
        void loadSteps()
    }, [loadSteps])

    const saveSteps = useCallback(async () => {

        const stepMap = await api.journeys.steps.set(project.id, journey.id, nodesToSteps(nodes, edges))

        const refreshed = stepsToNodes(stepMap)

        setNodes(refreshed.nodes)
        setEdges(refreshed.edges)

    }, [project, journey, nodes, edges])

    const onConnect = useCallback(async (connection: Connection) => {
        const sourceNode = nodes.find(n => n.id === connection.source)
        const data = await getStepType(sourceNode?.data.type)?.newEdgeData?.() ?? {}
        setEdges(edges => addEdge({
            ...connection,
            type: STEP_STYLE,
            data,
        }, edges))
    }, [nodes, setEdges])

    const onDragOver = useCallback<DragEventHandler>(event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback<DragEventHandler>(async event => {

        event.preventDefault()
        if (!wrapper.current || !flowInstance) return

        const bounds = wrapper.current.getBoundingClientRect()
        const type = event.dataTransfer.getData(DATA_FORMAT)
        const handler = getStepType(type)

        if (!handler) return

        const { x, y } = flowInstance.project({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        })

        const newStep = {
            id: createUuid(),
            position: {
                x,
                y,
            },
            type: 'step',
            data: {
                type,
                data: await handler.newData?.() ?? {},
            },
        }

        setNodes(nds => nds.concat(newStep))

    }, [setNodes, flowInstance, project, journey])

    return (
        <div className='journey'>
            <div className='journey-header'>
                <Link to='../journeys' className='journey-header-close'>
                    <i className="bi-x-lg" />
                </Link>
                <h2>{journey.name}</h2>
                <div className='actions'>
                    <div className='publish-details'>
                        <span className="publish-label">Last published at:</span>
                        <span className="publish-date">{formatDate(preferences, journey.updated_at)}</span>
                    </div>
                    <div>
                        <Button onClick={saveSteps}>
                            {'Publish'}
                        </Button>
                    </div>
                </div>
            </div>
            <div className='journey-options'>
                <h3>Components</h3>
                {
                    Object.entries(journeySteps).sort(createComparator(x => x[1].category)).filter(([, type]) => type.category !== 'entrance').map(([key, type]) => (
                        <div
                            key={key}
                            className={clsx('component', type.category)}
                            draggable
                            onDragStart={event => {
                                event.dataTransfer.setData(DATA_FORMAT, key)
                                event.dataTransfer.effectAllowed = 'move'
                            }}
                        >
                            <i className={clsx('component-handle', type.icon)} />
                            <div className='component-title'>{type.name}</div>
                            <div className='component-desc'>{type.description}</div>
                        </div>
                    ))
                }
            </div>
            <div className='journey-builder' ref={wrapper}>
                <ReactFlow
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setFlowInstance}
                    elementsSelectable
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    fitView
                >
                    <Background className='internal-canvas' />
                    <Controls />
                    <MiniMap
                        nodeClassName={({ data }: Node<JourneyStep>) => `journey-minimap ${getStepType(data.type)?.category ?? 'unknown'}`}
                    />
                </ReactFlow>
            </div>
        </div>
    )
}
