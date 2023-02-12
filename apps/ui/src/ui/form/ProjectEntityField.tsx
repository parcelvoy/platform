import { Combobox } from '@headlessui/react'
import { useCallback, useContext, useState } from 'react'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { ProjectEntityPath } from '../../api'
import { ProjectContext } from '../../contexts'
import useResolver from '../../hooks/useResolver'
import { FieldProps } from './Field'

export default function ProjectEntityField<X extends FieldValues, P extends FieldPath<X>>({
    apiPath,
    form,
    name,
    label = name,
    required,
}: FieldProps<X, P> & {
    apiPath: ProjectEntityPath<any>
}) {
    const [query, setQuery] = useState('')

    const { field } = useController<X, P>({
        control: form?.control,
        name,
        rules: {
            required,
        },
    })

    const [project] = useContext(ProjectContext)

    const [result] = useResolver(useCallback(async () =>
        await apiPath.search(project.id, { q: query, page: 0, itemsPerPage: 20 }), [project, query]))

    return (
        <Combobox value={field.value} by='id'>
            <Combobox.Label>
                {label}
            </Combobox.Label>
            <Combobox.Input onChange={e => setQuery(e.target.value)} />
            <Combobox.Options>
                {
                    result?.results.map(({ id, name }) => (
                        <Combobox.Option key={id} value={id}>
                            {name}
                        </Combobox.Option>
                    ))
                }
            </Combobox.Options>
        </Combobox>
    )
}
