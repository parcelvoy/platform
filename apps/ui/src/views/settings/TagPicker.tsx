import { ReactNode, useCallback, useContext, useMemo } from 'react'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { useResolver } from '../../hooks'
import { ControlledInputProps, FieldBindingsProps } from '../../types'
import { MultiSelect } from '../../ui/form/MultiSelect'
import { snakeToTitle } from '../../utils'

export interface TagPickerProps extends ControlledInputProps<string[]> {
    entity?: 'journeys' | 'campaigns' | 'users' | 'lists'
    placeholder?: ReactNode
}

export function TagPicker({
    entity,
    value,
    ...rest
}: TagPickerProps) {
    const [project] = useContext(ProjectContext)
    const [tags] = useResolver(useCallback(async () => {
        if (entity) {
            return await api.tags.used(project.id, entity)
        }
        return await api.tags.all(project.id)
    }, [project, entity]))

    value = useMemo(() => value ?? [], [value])

    if (!tags?.length) return null

    return (
        <MultiSelect
            {...rest}
            value={value}
            options={tags}
            toValue={t => t.name}
            getOptionDisplay={({ name, count }) => name + (count !== undefined ? ` (${count})` : '')}
            getSelectedOptionDisplay={({ name }) => name}
        />
    )
}

TagPicker.Field = function TagPickerField<X extends FieldValues, P extends FieldPath<X>>({
    form,
    label,
    name,
    required,
    ...rest
}: FieldBindingsProps<TagPickerProps, string[], X, P>) {

    const { field: { ref, ...field } } = useController({
        control: form.control,
        name,
        rules: {
            required,
        },
    })

    return (
        <TagPicker
            {...rest}
            {...field}
            required={required}
            label={label ?? snakeToTitle(name)}
        />
    )
}
