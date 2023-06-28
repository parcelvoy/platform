import { useCallback } from 'react'
import { JourneyStepType } from '../../../types'
import { GateStepIcon } from '../../../ui/icons'
import api from '../../../api'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { ListCreateForm } from '../../users/ListCreateForm'

interface GateConfig {
    list_id: number
}

export const gateStep: JourneyStepType<GateConfig> = {
    name: 'Gate',
    icon: <GateStepIcon />,
    category: 'flow',
    description: 'Proceed on different paths depending on condition results.',
    newData: async () => ({
        list_id: 0,
    }),
    Edit({
        onChange,
        project: {
            id: projectId,
        },
        value,
    }) {
        return (
            <EntityIdPicker
                label="Rule Set"
                subtitle="Does the user match the conditions of the rule set."
                get={useCallback(async id => await api.lists.get(projectId, id), [projectId])}
                search={useCallback(async q => await api.lists.search(projectId, { q, limit: 50 }), [projectId])}
                value={value.list_id}
                onChange={list_id => onChange({ ...value, list_id })}
                required
                createModalSize="large"
                renderCreateForm={onCreated => (
                    <ListCreateForm
                        isJourneyList={true}
                        onCreated={onCreated}
                    />
                )}
                onEditLink={list => window.open(`/projects/${projectId}/lists/${list.id}`)}
            />
        )
    },
    sources: ['Yes', 'No'],
}
