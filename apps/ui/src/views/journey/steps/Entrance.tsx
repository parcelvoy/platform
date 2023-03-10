import { useCallback } from 'react'
import api from '../../../api'
import { JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { EntranceStepIcon } from '../../../ui/icons'

interface EntranceConfig {
    list_id: number
}

export const entranceStep: JourneyStepType<EntranceConfig> = {
    name: 'Entrance',
    icon: <EntranceStepIcon />,
    category: 'entrance',
    description: 'How users are added to this journey.',
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
        const getList = useCallback(async (id: number) => await api.lists.get(projectId, id), [projectId])
        const searchLists = useCallback(async (q: string) => await api.lists.search(projectId, { q, page: 0, itemsPerPage: 50 }), [projectId])
        return (
            <>
                <EntityIdPicker
                    label="List"
                    subtitle="Users added to this list will automatically start this journey."
                    required
                    get={getList}
                    search={searchLists}
                    value={value.list_id}
                    onChange={list_id => onChange({ ...value, list_id })}
                />
            </>
        )
    },
}
