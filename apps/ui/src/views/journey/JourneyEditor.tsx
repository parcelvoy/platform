import { createElement, DragEventHandler, Fragment, memo, ReactNode, SetStateAction, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
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
    NodeMouseHandler,
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
import { camelToTitle, createComparator, createUuid } from '../../utils'
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
import { ActionStepIcon, CheckCircleIcon, CloseIcon, CopyIcon, DelayStepIcon, EntranceStepIcon, ForbiddenIcon, KeyIcon } from '../../ui/icons'
import Tag from '../../ui/Tag'
import TextInput from '../../ui/form/TextInput'
import { SearchTable } from '../../ui'
import { useSearchTableState } from '../../ui/SearchTable'
import { typeVariants } from './EntranceDetails'
import { useTranslation } from 'react-i18next'

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
    exit: 'red',
}

interface StepUsersProps {
    stepId: number
    entrance?: boolean
}

function StepUsers({ entrance, stepId }: StepUsersProps) {

    const { t } = useTranslation()
    const [{ id: projectId }] = useContext(ProjectContext)
    const [{ id: journeyId }] = useContext(JourneyContext)

    const state = useSearchTableState(useCallback(async params => await api.journeys.steps.searchUsers(projectId, journeyId, stepId, params), [projectId, journeyId, stepId]), {
        limit: 10,
    })

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    {
                        key: 'name',
                        title: t('name'),
                        cell: ({ item }) => item.user!.full_name ?? '-',
                    },
                    {
                        key: 'external_id',
                        title: t('external_id'),
                        cell: ({ item }) => item.user?.external_id ?? '-',
                    },
                    {
                        key: 'email',
                        title: t('email'),
                        cell: ({ item }) => item.user?.email ?? '-',
                    },
                    {
                        key: 'phone',
                        title: t('phone'),
                        cell: ({ item }) => item.user?.phone ?? '-',
                    },
                    {
                        key: 'type',
                        title: t('type'),
                        cell: ({ item }) => (
                            <Tag variant={typeVariants[item.type]}>
                                {camelToTitle(item.type)}
                            </Tag>
                        ),
                    },
                    {
                        key: 'created_at',
                        title: t('step_date'),
                        cell: ({ item }) => item.created_at,
                    },
                    {
                        key: 'delay_until',
                        title: t('delay_until'),
                        cell: ({ item }) => item.delay_until,
                    },
                ]}
                onSelectRow={entrance ? ({ id }) => window.open(`/projects/${projectId}/entrances/${id}`, '_blank') : undefined}
            />
        </>
    )
}

function JourneyStepNode({
    id,
    data: {
        type: typeName,
        name,
        data,
        data_key,
        stats,
        editing,
    } = {},
    selected,
}: NodeProps) {

    if (!stats) stats = {}

    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)
    const { getNode, getEdges } = useReactFlow()

    const type = getStepType(typeName)

    const validateConnection = useCallback((conn: Connection) => {
        if (!type) return false
        if (type.multiChildSources) return true
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
                    editing && 'editing',
                )}
            >
                <div className="journey-step-header">
                    <span className={clsx('step-header-icon', stepCategoryColors[type.category])}>
                        {type.icon}
                    </span>
                    <h4 className="step-header-title">{name || t(type.name)}</h4>
                    <div className="step-header-stats">
                        <span className="stat">
                            {(stats.completed ?? 0).toLocaleString()}
                            {statIcons.completed}
                        </span>
                        {
                            (typeName === 'delay' || !!stats.delay) && (
                                <span className="stat">
                                    {(stats.delay ?? 0).toLocaleString()}
                                    {statIcons.delay}
                                </span>
                            )
                        }
                        {
                            (typeName === 'action' || !!stats.action) && (
                                <span className="stat">
                                    {(stats.action ?? 0).toLocaleString()}
                                    {statIcons.action}
                                </span>
                            )
                        }
                    </div>
                </div>
                <div className="journey-step-body">
                    {
                        type.Describe && createElement(type.Describe, {
                            project,
                            journey,
                            value: data,
                            onChange: () => {},
                        })
                    }
                    {
                        !!data_key && (
                            <div className="data-key" style={{ marginTop: type.Describe ? 10 : undefined }}>
                                <KeyIcon />
                                {data_key}
                            </div>
                        )
                    }
                </div>
            </div>
            {
                (
                    Array.isArray(type.sources)
                        ? type.sources
                        : ['']
                ).map((key, index, arr) => {
                    const left = (((index + 1) / (arr.length + 1)) * 100) + '%'
                    return (
                        <Fragment key={key}>
                            {
                                key && (
                                    <span
                                        className="step-handle-label"
                                        style={{
                                            left,
                                        }}
                                    >
                                        {key}
                                    </span>
                                )
                            }
                            <Handle
                                type="source"
                                position={Position.Bottom} id={key + '-s-' + id}
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
    path?: string
}

function createEdge({
    data,
    sourceId,
    targetId,
    path,
}: CreateEdgeParams): Edge {
    return {
        id: 'e-' + sourceId + '__' + targetId,
        source: sourceId,
        sourceHandle: (path ?? '') + '-s-' + sourceId,
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

    for (const [id, { x, y, type, data, name, data_key, children, stats, stats_at, id: stepId }] of Object.entries(stepMap)) {
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
                data_key,
                data,
                stats,
                stats_at,
                stepId,
            },
        })
        children?.forEach(({ external_id, path, data }) => edges.push(createEdge({
            sourceId: id,
            targetId: external_id,
            data,
            path,
        })))
    }

    return { nodes, edges }
}

const getSourcePath = (handleId: string) => handleId.substring(0, handleId.indexOf('-s-'))

function nodesToSteps(nodes: Node[], edges: Edge[]) {
    return nodes.reduce<JourneyStepMap>((a, {
        id,
        data: {
            type,
            name = '',
            data_key,
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
            data_key,
            x,
            y,
            children: edges
                .filter(e => e.source === id)
                .map(({ data = {}, sourceHandle, target }) => ({
                    external_id: target,
                    path: getSourcePath(sourceHandle!),
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
        .map((edge) => createEdge({
            sourceId: mapping[edge.source],
            targetId: mapping[edge.target],
            data: edge.data ?? {},
            path: getSourcePath(edge.sourceHandle!),
        }))
    return { nodeCopies, edgeCopies }
}

export default function JourneyEditor() {
    const navigate = useNavigate()
    const { t } = useTranslation()
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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
    )

    useEffect(() => {
        if (blocker.state !== 'blocked') return
        if (confirm(t('confirm_unsaved_changes'))) {
            blocker.proceed()
        } else {
            blocker.reset()
        }
    }, [blocker.state])

    const handleSetNodes = (nodes: SetStateAction<Array<Node<any, string | undefined>>>) => {
        setHasUnsavedChanges(true)
        setNodes(nodes)
    }

    const saveSteps = useCallback(async () => {

        setSaving(true)
        try {
            const stepMap = await api.journeys.steps.set(project.id, journey.id, nodesToSteps(nodes, edges))

            const refreshed = stepsToNodes(stepMap)

            setNodes(refreshed.nodes)
            setEdges(refreshed.edges)

            toast.success(t('journey_saved'))
        } catch (error: any) {
            toast.error(`Unable to save: ${error}`)
        } finally {
            setHasUnsavedChanges(false)
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

        handleSetNodes(nds => nds.concat(newStep))

    }, [setNodes, flowInstance, project, journey])

    const [editOpen, setEditOpen] = useState(false)

    const selected = nodes.filter(n => n.selected)

    const editNode = nodes.find(n => n.data.editing)

    const [viewUsersStep, setViewUsersStep] = useState<null | { stepId: number, entrance?: boolean }>(null)

    const onNodeDoubleClick = useCallback<NodeMouseHandler>((_, n) => {
        setNodes(nds => nds.map(x => x.id === n.id
            ? {
                ...n,
                data: {
                    ...n.data,
                    editing: true,
                },
            }
            : x,
        ))
        const x = n.position.x + ((n.width ?? 120) / 2)
        const y = n.position.y + ((n.height ?? 120) / 2)
        setTimeout(() => flowInstance?.setCenter(x, y, { zoom: 1 }), 10)
    }, [flowInstance?.setCenter])

    let stepEdit: ReactNode = null
    if (editNode) {
        const type = getStepType(editNode.data.type)
        if (type) {
            const stats = editNode.data.stats ?? {}
            stepEdit = (
                <>
                    <div className="journey-step-header">
                        <span className={clsx('step-header-icon', stepCategoryColors[type.category])}>
                            {type.icon}
                        </span>
                        <h4 className="step-header-title">{t(type.name)}</h4>
                        <div
                            className="step-header-stats"
                            role={editNode.data.stepId ? 'button' : undefined}
                            onClick={editNode.data.stepId
                                ? () => setViewUsersStep({ stepId: editNode.data.stepId, entrance: editNode.data.type === 'entrance' })
                                : undefined
                            }
                            style={{
                                cursor: editNode.data.stepId ? 'cursor' : undefined,
                            }}
                        >
                            <span className="stat">
                                {stats.completed ?? 0}
                                {statIcons.completed}
                            </span>
                            {
                                (editNode.data.type === 'delay' || !!stats.delay) && (
                                    <span className="stat">
                                        {stats.delay ?? 0}
                                        {statIcons.delay}
                                    </span>
                                )
                            }
                            {
                                (editNode.data.type === 'action' || !!stats.action) && (
                                    <span className="stat">
                                        {stats.action ?? 0}
                                        {statIcons.action}
                                    </span>
                                )
                            }
                        </div>
                    </div>
                    <div className="journey-options-edit">
                        <TextInput
                            label={t('name')}
                            name="name"
                            value={editNode.data.name ?? ''}
                            onChange={name => handleSetNodes(nds => nds.map(n => n.id === editNode.id ? { ...n, data: { ...n.data, name } } : n))}
                        />
                        {
                            type.hasDataKey && (
                                <TextInput
                                    label={t('data_key')}
                                    subtitle={t('data_key_description')}
                                    name="data_key"
                                    value={editNode.data.data_key}
                                    onChange={data_key => handleSetNodes(nds => nds.map(n => n.id === editNode.id ? { ...n, data: { ...n.data, data_key } } : n))}
                                />
                            )
                        }
                        {
                            type.Edit && createElement(type.Edit, {
                                value: editNode.data.data ?? {},
                                onChange: data => handleSetNodes(nds => nds.map(n => n.id === editNode.id
                                    ? {
                                        ...editNode,
                                        data: {
                                            ...editNode.data,
                                            data,
                                        },
                                    }
                                    : n,
                                )),
                                project,
                                journey,
                                stepId: editNode.data.stepId,
                                nodes,
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
                        {journey.published ? t('published') : t('draft')}
                    </Tag>
                    <Button
                        variant="secondary"
                        onClick={() => setEditOpen(true)}
                    >
                        {t('edit_details')}
                    </Button>
                    <Button
                        onClick={saveSteps}
                        isLoading={saving}
                        variant="primary"
                    >
                        {t('save')}
                    </Button>
                </>
            }
        >
            <div className={clsx('journey', editNode && 'editing')}>
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
                        onNodeDoubleClick={onNodeDoubleClick}
                        onClick={() => {
                            if (editNode) {
                                setNodes(nds => nds.map(n => n.data.editing ? { ...n, data: { ...n.data, editing: false } } : n))
                            }
                        }}
                        elementsSelectable
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        panOnScroll
                        selectNodesOnDrag
                        fitView
                        maxZoom={1}
                        minZoom={0.2}
                        zoomOnDoubleClick={false}
                    >
                        <Background className="internal-canvas" />
                        {
                            !editNode && (
                                <>
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
                                </>
                            )
                        }
                    </ReactFlow>
                </div>
                <div className="journey-options">
                    {
                        stepEdit ?? (
                            <>
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
                                            <div className="component-title">{t(type.name)}</div>
                                            <div className="component-desc">{t(type.description)}</div>
                                        </div>
                                    ))
                                }
                            </>
                        )
                    }
                </div>
            </div>
            <Modal
                open={editOpen}
                onClose={setEditOpen}
                title={t('edit_journey_details')}
            >
                <JourneyForm
                    journey={journey}
                    onSaved={async journey => {
                        setEditOpen(false)
                        setJourney(journey)
                    }}
                />
            </Modal>
            <Modal
                open={!!viewUsersStep}
                onClose={() => setViewUsersStep(null)}
                title={t('users')}
                size="large"
            >
                {
                    viewUsersStep && (
                        <StepUsers {...viewUsersStep} />
                    )
                }
            </Modal>
        </Modal>
    )
}
