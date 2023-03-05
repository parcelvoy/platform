import { useCallback, useContext } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import useResolver from '../../hooks/useResolver'
import { ControlledProps } from '../../types'
import { MultiSelect } from '../../ui/form/MultiSelect'

export interface TagPickerProps extends ControlledProps<string[]> {
    entity: 'journeys' | 'campaigns' | 'users' | 'lists'
}

export function TagPicker({
    entity,
    onChange,
    value,
}: TagPickerProps) {
    const [project] = useContext(ProjectContext)
    const [tags] = useResolver(useCallback(async () => await api.tags.used(project.id, entity), [project, entity]))

    if (!tags) return null

    return (
        <MultiSelect
            value={value}
            onChange={onChange}
            options={tags}
            toValue={t => t.name}
            getOptionDisplay={({ name, count }) => `${name} (${count})`}
        />
    )
}
