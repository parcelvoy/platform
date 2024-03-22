import { useContext } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { List, ListCreateParams } from '../../types'
import FormWrapper from '../../ui/form/FormWrapper'
import RadioInput from '../../ui/form/RadioInput'
import TextInput from '../../ui/form/TextInput'
import { TagPicker } from '../settings/TagPicker'
import { createWrapperRule } from './RuleBuilder'
import { useTranslation } from 'react-i18next'

interface ListCreateFormProps {
    onCreated?: (list: List) => void
}

export function ListCreateForm({ onCreated }: ListCreateFormProps) {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const defaults: Partial<ListCreateParams> = {
        type: 'dynamic',
        rule: createWrapperRule(),
    }

    return (
        <FormWrapper<ListCreateParams>
            onSubmit={
                async list => {
                    const rule = list.rule ?? createWrapperRule()
                    const created = await api.lists.create(project.id, {
                        ...list,
                        rule: list.type === 'dynamic' ? rule : undefined,
                        is_visible: true,
                    })
                    onCreated?.(created)
                }
            }
            defaultValues={defaults}
            submitLabel={t('save')}
        >
            {form => (
                <>
                    <TextInput.Field
                        form={form}
                        name="name"
                        label={t('list_save')}
                        required
                    />
                    <RadioInput.Field
                        form={form}
                        name="type"
                        label={t('type')}
                        options={[
                            { key: 'dynamic', label: t('dynamic') },
                            { key: 'static', label: t('static') },
                        ]}
                    />
                    <TagPicker.Field
                        form={form}
                        name="tags"
                        label={t('tags')}
                    />
                </>
            )}
        </FormWrapper>
    )
}
