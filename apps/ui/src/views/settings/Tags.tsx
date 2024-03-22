import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Tag } from '../../types'
import Button from '../../ui/Button'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { PlusIcon } from '../../ui/icons'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { useTranslation } from 'react-i18next'

export default function Tags() {

    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const search = useSearchTableState(useCallback(async params => await api.tags.search(project.id, params), [project]))
    const [editing, setEditing] = useState<Tag>()

    return (
        <>
            <SearchTable
                {...search}
                columns={[
                    { key: 'name', title: t('name') },
                ]}
                title={t('tags')}
                description={t('tags_description')}
                actions={
                    <>
                        <Button
                            size="small"
                            variant="primary"
                            onClick={() => setEditing({ id: 0, name: 'New Tag' })}
                            icon={<PlusIcon />}
                        >{t('create_tag')}</Button>
                    </>
                }
                onSelectRow={setEditing}
            />
            <Modal
                open={!!editing}
                onClose={() => setEditing(undefined)}
                title={editing?.id ? t('update_tag') : t('create_tag')}
            >
                {
                    editing && (
                        <FormWrapper<Tag>
                            onSubmit={async ({ id, name }) => {
                                id
                                    ? await api.tags.update(project.id, id, { name })
                                    : await api.tags.create(project.id, { name })
                                await search.reload()
                                setEditing(undefined)
                            }}
                            defaultValues={editing}
                        >
                            {form => (
                                <TextInput.Field
                                    form={form}
                                    name="name"
                                    label={t('name')}
                                    required />
                            )}
                        </FormWrapper>
                    )
                }
            </Modal>
        </>
    )
}
