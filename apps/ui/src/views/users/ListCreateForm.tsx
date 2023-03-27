import { useContext } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { List, ListCreateParams } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import OptionField from '../../ui/form/OptionField'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'
import { createWrapperRule } from './RuleBuilder'

interface ListCreateFormProps {
    onCreated?: (list: List) => void
}

export function ListCreateForm({ onCreated }: ListCreateFormProps) {
    const [project] = useContext(ProjectContext)

    return (
        <FormWrapper<Omit<ListCreateParams, 'rule'>>
            onSubmit={
                async list => {
                    const created = await api.lists.create(project.id, {
                        ...list,
                        rule: list.type === 'dynamic' ? createWrapperRule() : undefined,
                    })
                    onCreated?.(created)
                }
            }
            defaultValues={{ type: 'dynamic' }}
            submitLabel="Save"
        >
            {form => (
                <>
                    <TextInput.Field
                        form={form}
                        name="name"
                        label="List Name"
                        required
                    />
                    <OptionField
                        form={form}
                        name="type"
                        label="Type"
                        options={[
                            { key: 'dynamic', label: 'Dynamic' },
                            { key: 'static', label: 'Static' },
                        ]}
                    />
                    <TagPicker.Field
                        form={form}
                        name="tags"
                    />
                </>
            )}
        </FormWrapper>
    )
}
