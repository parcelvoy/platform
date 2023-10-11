import { createElement, DragEventHandler, Fragment, memo, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    getConnectedEdges,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    NodeProps,
    NodeTypes,
    OnEdgeUpdateFunc,
    Panel,
    Position,
    ReactFlowInstance,
    updateEdge,
    useEdges,
    useEdgesState,
    useNodes,
    useNodesState,
    useReactFlow,
} from 'reactflow'
import { JourneyContext, ProjectContext } from '../../contexts'
import { createComparator, createUuid } from '../../utils'
import * as journeySteps from './steps/index'
import clsx from 'clsx'
import api from '../../api'
import { JourneyStep, JourneyStepMap, JourneyStepType } from '../../types'

import './JourneyEditor.css'
import 'reactflow/dist/style.css'
import Button from '../../ui/Button'
import Alert from '../../ui/Alert'
import Modal from '../../ui/Modal'
import { toast } from 'react-hot-toast/headless'
import { JourneyForm } from './JourneyForm'
import { ActionStepIcon, CheckCircleIcon, CloseIcon, CopyIcon, DelayStepIcon, EntranceStepIcon, ForbiddenIcon } from '../../ui/icons'
import Tag from '../../ui/Tag'
import TextInput from '../../ui/form/TextInput'

const getStepType = (type: string) => (type ? journeySteps[type as keyof typeof journeySteps] as JourneyStepType : null) ?? null

const statIcons: Record<string, ReactNode> = {
    action: <ActionStepIcon />,
    delay: <DelayStepIcon />,
    completed: <CheckCircleIcon />,
    error: <ForbiddenIcon />,
    entrance: <EntranceStepIcon />,
    ended: <CloseIcon />,
}

export const stepCategoryColors = {
    entrance: 'red',
    action: 'blue',
    flow: 'green',
    delay: 'yellow',
}

function JourneyStepNode({
    id,
    data: {
        type: typeName,
        name,
        data,
        stats,
    } = {},
    selected,
}: NodeProps) {

    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)
    const { getNode, getEdges } = useReactFlow()

    const type = getStepType(typeName)

    const validateConnection = useCallback((conn: Connection) => {
        if (!type) return false
        if (type.sources === 'multi') return true
        const sourceNode = conn.source && getNode(conn.source)
        if (!sourceNode) return true
        const existing = getConnectedEdges([sourceNode], getEdges())
        return existing.filter(e => e.sourceHandle === conn.sourceHandle).length < 1
    }, [id, type, getNode, getEdges])

    if (!type) {
        return (
            <Alert variant="error" title="Invalid Step Type" />
        )
    }

    return (
        <>
            {
                type.category !== 'entrance' && (
                    <Handle type="target" position={Position.Top} id={'t-' + id} />
                )
            }
            <div
                className={clsx(
                    'journey-step',
                    type.category,
                    selected && 'selected',
                    Array.isArray(type.sources) && 'journey-step-labelled-sources',
                )}
            >
                <div className="journey-step-header">
                    <span className={clsx('step-header-icon', stepCategoryColors[type.category])}>
                        {type.icon}
                    </span>
                    <h4 className="step-header-title">{name || type.name}</h4>
                    {
                        stats && (
                            <div className="step-header-stats">
                                <span className="stat">
                                    {stats.completed ?? 0}
                                    {statIcons.completed}
                                </span>
                                {
                                    !!stats.delay && (
                                        <span className="stat">
                                            {stats.delay ?? 0}
                                            {statIcons.delay}
                                        </span>
                                    )
                                }
                            </div>
                        )
                    }
                </div>
                {
                    type.Describe && (
                        <div className="journey-step-body">
                            {
                                createElement(type.Describe, {
                                    project,
                                    journey,
                                    value: data,
                                    onChange: () => {},
                                })
                            }
                        </div>
                    )
                }
            </div>
            {
                (
                    Array.isArray(type.sources)
                        ? type.sources
                        : ['']
                ).map((label, index, arr) => {
                    const left = (((index + 1) / (arr.length + 1)) * 100) + '%'
                    return (
                        <Fragment key={label}>
                            {
                                label && (
                                    <span
                                        className="step-handle-label"
                                        style={{
                                            left,
                                        }}
                                    >
                                        {label}
                                    </span>
                                )
                            }
                            <Handle
                                type="source"
                                position={Position.Bottom} id={index + '-s-' + id}
                                isValidConnection={validateConnection}
                                style={{
                                    left,
                                }}
                            />
                        </Fragment>
                    )
                })
            }
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
    sourceHandleId,
    targetHandleId,
    data = {},
}: EdgeProps) {

    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)
    const nodes = useNodes()
    const edges = useEdges()
    const siblingData = useMemo(() => edges.filter(e => e.sourceHandle === sourceHandleId && e.targetHandle !== targetHandleId).map(e => e.data ?? {}), [edges, sourceHandleId, targetHandleId])

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    const { setEdges } = useReactFlow()

    const onChangeData = useCallback((data: any) => setEdges(edges => edges.map(e => e.id === id ? { ...e, data } : e)), [id, setEdges])

    const sourceNode = nodes.find(n => n.id === source) as Node<any> | undefined
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
                                    siblingData,
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

interface CreateEdgeParams {
    sourceId: string
    targetId: string
    data: any
    index: number
    stepType: JourneyStepType<any, any> | null
}

function createEdge({
    data,
    index,
    sourceId,
    stepType,
    targetId,
}: CreateEdgeParams): Edge {
    return {
        id: 'e-' + sourceId + '__' + targetId,
        source: sourceId,
        sourceHandle: (Array.isArray(stepType?.sources) ? index : 0) + '-s-' + sourceId,
        target: targetId,
        targetHandle: 't-' + targetId,
        data,
        type: STEP_STYLE,
        markerEnd: {
            type: MarkerType.ArrowClosed,
        },
    }
}

function stepsToNodes(stepMap: JourneyStepMap) {

    const nodes: Node[] = []
    const edges: Edge[] = []

    for (const [id, { x, y, type, data, name, children, stats, stats_at }] of Object.entries(stepMap)) {
        nodes.push({
            id,
            position: {
                x,
                y,
            },
            type: 'step',
            data: {
                type,
                name,
                data,
                stats,
                stats_at,
            },
        })
        const stepType = getStepType(type)
        children?.forEach(({ external_id, data }, index) => edges.push(createEdge({
            sourceId: id,
            targetId: external_id,
            index,
            data,
            stepType,
        })))
    }

    return { nodes, edges }
}

const getSourceIndex = (handleId: string) => parseInt(handleId.substring(0, handleId.indexOf('-s-')), 10)

function nodesToSteps(nodes: Node[], edges: Edge[]) {
    return nodes.reduce<JourneyStepMap>((a, {
        id,
        data: {
            type,
            name = '',
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
            name,
            x,
            y,
            children: edges
                .filter(e => e.source === id)
                .sort((x, y) => getSourceIndex(x.sourceHandle!) - getSourceIndex(y.sourceHandle!))
                .map(({ data = {}, target }) => ({
                    external_id: target,
                    data,
                })),
        }
        return a
    }, {})
}

function cloneNodes(edges: Edge[], targets: Node[]) {
    const mapping: { [prev: string]: string } = {}
    const nodeCopies: Node[] = []
    for (const node of targets) {
        const id = createUuid()
        mapping[node.id] = id
        nodeCopies.push({
            ...node,
            data: {
                ...node.data ?? {},
                name: node.data.name ? node.data.name + ' (Copy)' : undefined,
            },
            id,
            position: {
                x: node.position.x + 50,
                y: node.position.y + 50,
            },
        })
    }
    const edgeCopies = getConnectedEdges(targets, edges)
        .filter(edge => edge.source in mapping && edge.target in mapping)
        .map((edge, index) => createEdge({
            sourceId: mapping[edge.source],
            targetId: mapping[edge.target],
            index,
            data: edge.data ?? {},
            stepType: targets
                .filter(n => n.id === edge.source)
                .map(n => getStepType(n.data.type))
                .at(0)!,
        }))
    return { nodeCopies, edgeCopies }
}

export default function JourneyEditor() {
    const navigate = useNavigate()
    const [flowInstance, setFlowInstance] = useState<null | ReactFlowInstance>(null)
    const wrapper = useRef<HTMLDivElement>(null)

    const [project] = useContext(ProjectContext)
    const [journey, setJourney] = useContext(JourneyContext)

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    const journeyId = journey.id

    const loadSteps = useCallback(async () => {

        const steps = await api.journeys.steps.get(project.id, journeyId)

        const { edges, nodes } = stepsToNodes(steps)

        setNodes(nodes)
        setEdges(edges)

    }, [project, journeyId])

    useEffect(() => {
        void loadSteps()
    }, [loadSteps])

    const [saving, setSaving] = useState(false)
    const saveSteps = useCallback(async () => {

        setSaving(true)

        try {
            const stepMap = await api.journeys.steps.set(project.id, journey.id, nodesToSteps(nodes, edges))

            const refreshed = stepsToNodes(stepMap)

            setNodes(refreshed.nodes)
            setEdges(refreshed.edges)

            toast.success('Saved!')
        } catch (error: any) {
            toast.error(`Unable to save: ${error}`)
        } finally {
            setSaving(false)
        }
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

    const onEdgeUpdate = useCallback<OnEdgeUpdateFunc>((prev, next) => {
        setEdges(edges => updateEdge(prev, next, edges))
    }, [setEdges])

    const onDragOver = useCallback<DragEventHandler>(event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback<DragEventHandler>(async event => {

        event.preventDefault()
        if (!wrapper.current || !flowInstance) return

        const bounds = wrapper.current.getBoundingClientRect()
        const payload: {
            type: string
            x: number
            y: number
        } = JSON.parse(event.dataTransfer.getData(DATA_FORMAT))
        const type = getStepType(payload.type)

        if (!type) return

        const { x, y } = flowInstance.project({
            x: event.clientX - bounds.left - (payload.x ?? 0),
            y: event.clientY - bounds.top - (payload.y ?? 0),
        })

        const newStep = {
            id: createUuid(),
            position: {
                x,
                y,
            },
            type: 'step',
            data: {
                type: payload.type,
                data: await type.newData?.() ?? {},
            },
        }

        setNodes(nds => nds.concat(newStep))

    }, [setNodes, flowInstance, project, journey])

    const [editOpen, setEditOpen] = useState(false)

    const selected = nodes.filter(n => n.selected)

    let stepEdit: ReactNode = null
    if (selected.length === 1) {
        const editing = selected[0]
        const type = getStepType(editing.data.type)
        if (type) {
            stepEdit = (
                <>
                    <div className="journey-step-header">
                        <span className={clsx('step-header-icon', stepCategoryColors[type.category])}>
                            {type.icon}
                        </span>
                        <h4 className="step-header-title">{type.name}</h4>
                        {
                            editing.data.stats && (
                                <div className="step-header-stats">
                                    <span className="stat">
                                        {editing.data.stats.completed ?? 0}
                                        {statIcons.completed}
                                    </span>
                                    {
                                        !!editing.data.stats.delay && (
                                            <span className="stat">
                                                {editing.data.stats.delay ?? 0}
                                                {statIcons.delay}
                                            </span>
                                        )
                                    }
                                </div>
                            )
                        }
                    </div>
                    <div style={{ padding: 10 }}>
                        <TextInput
                            label="Name"
                            name="name"
                            value={editing.data.name ?? ''}
                            onChange={name => setNodes(nds => nds.map(n => n.id === editing.id ? { ...n, data: { ...n.data, name } } : n))}
                        />
                        {
                            type.hasDataKey && (
                                <TextInput
                                    label="Data Key"
                                    subtitle="Makes data stored at this step available in user update and campaign templates."
                                    name="data_key"
                                    value={editing.data.data_key}
                                    onChange={data_key => setNodes(nds => nds.map(n => n.id === editing.id ? { ...n, data: { ...n.data, data_key } } : n))}
                                />
                            )
                        }
                        {
                            type.Edit && createElement(type.Edit, {
                                value: editing.data.data ?? {},
                                onChange: data => setNodes(nds => nds.map(n => n.id === editing.id
                                    ? {
                                        ...editing,
                                        data: {
                                            ...editing.data,
                                            data,
                                        },
                                    }
                                    : n,
                                )),
                                project,
                                journey,
                            })
                        }
                    </div>
                </>
            )
        }
    }

    return (
        <Modal
            size="fullscreen"
            title={journey.name}
            open={true}
            onClose={() => navigate('../journeys')}
            actions={
                <>
                    <Tag
                        variant={journey.published ? 'success' : 'plain'}
                        size="large">
                        {journey.published ? 'Published' : 'Draft'}
                    </Tag>
                    <Button
                        variant="secondary"
                        onClick={() => setEditOpen(true)}
                    >
                        {'Edit Details'}
                    </Button>
                    <Button
                        onClick={saveSteps}
                        isLoading={saving}
                        variant="primary"
                    >
                        {'Save'}
                    </Button>
                </>
            }
        >
            <div className="journey">
                <div className="journey-options">
                    <h4>Components</h4>
                    {
                        Object.entries(journeySteps).sort(createComparator(x => x[1].category)).map(([key, type]) => (
                            <div
                                key={key}
                                className={clsx('component', type.category)}
                                draggable
                                onDragStart={event => {
                                    const rect = (event.target as HTMLDivElement).getBoundingClientRect()
                                    event.dataTransfer.setData(DATA_FORMAT, JSON.stringify({
                                        type: key,
                                        x: event.clientX - rect.left,
                                        y: event.clientY - rect.top,
                                    }))
                                    event.dataTransfer.effectAllowed = 'move'
                                }}
                            >
                                <span className={clsx('component-handle', type.category)}>
                                    {type.icon}
                                </span>
                                <div className="component-title">{type.name}</div>
                                <div className="component-desc">{type.description}</div>
                            </div>
                        ))
                    }
                </div>
                <div className="journey-builder" ref={wrapper}>
                    <ReactFlow
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onEdgeUpdate={onEdgeUpdate}
                        onInit={setFlowInstance}
                        elementsSelectable
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        panOnScroll
                        selectNodesOnDrag
                        fitView
                        maxZoom={1.5}
                    >
                        <Background className="internal-canvas" />
                        <Controls />
                        <MiniMap
                            nodeClassName={({ data }: Node<JourneyStep>) => `journey-minimap ${getStepType(data.type)?.category ?? 'unknown'}`}
                        />
                        <Panel position="top-left">
                            {
                                selected.length
                                    ? (
                                        <Button
                                            icon={<CopyIcon />}
                                            onClick={() => {
                                                const { nodeCopies, edgeCopies } = cloneNodes(edges, selected)
                                                setNodes([...nodes.map(n => ({ ...n, selected: false })), ...nodeCopies])
                                                setEdges([...edges.map(e => ({ ...e, selected: false })), ...edgeCopies])
                                            }}
                                            size="small"
                                        >
                                            {`Duplicate Selected Steps (${selected.length})`}
                                        </Button>
                                    )
                                    : (
                                        'Shift+Drag to Multi Select'
                                    )
                            }
                        </Panel>
                    </ReactFlow>
                </div>
                {
                    stepEdit && (
                        <div className="journey-options">
                            {stepEdit}
                        </div>
                    )
                }
            </div>
            <Modal
                open={editOpen}
                onClose={setEditOpen}
                title="Edit Journey Details"
            >
                <JourneyForm
                    journey={journey}
                    onSaved={async journey => {
                        setEditOpen(false)
                        setJourney(journey)
                    }}
                />
            </Modal>
        </Modal>
    )
}
