import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { ProjectApiKey, projectRoles } from '../../types'
import Button from '../../ui/Button'
import RadioInput from '../../ui/form/RadioInput'
import TextInput from '../../ui/form/TextInput'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { ArchiveIcon, CopyIcon, PlusIcon } from '../../ui/icons'
import Menu, { MenuItem } from '../../ui/Menu'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { snakeToTitle } from '../../utils'
import { toast } from 'react-hot-toast/headless'
import Alert from '../../ui/Alert'
import { useTranslation } from 'react-i18next'

export default function ProjectApiKeys() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.apiKeys.search(project.id, params), [project]))

    const [editing, setEditing] = useState<null | Partial<ProjectApiKey>>(null)

    const handleArchive = async (id: number) => {
        if (confirm(t('delete_key_confirmation'))) {
            await api.apiKeys.delete(project.id, id)
            await state.reload()
        }
    }

    const handleCopy = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, value: string) => {
        await navigator.clipboard.writeText(value)
        event.stopPropagation()
        toast.success('Copied API Key')
    }

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'name', title: t('name') },
                    {
                        key: 'scope',
                        title: t('scope'),
                        cell: ({ item }) => snakeToTitle(item.scope),
                    },
                    {
                        key: 'role',
                        title: t('role'),
                        cell: ({ item }) => item.scope === 'public'
                            ? undefined
                            : snakeToTitle(item.role ?? ''),
                    },
                    {
                        key: 'value',
                        title: t('value'),
                        cell: ({ item }) => (
                            <div className="cell-content">
                                {item.value}
                                <Button icon={<CopyIcon />} size="small" variant="plain" onClickCapture={async (e) => await handleCopy(e, item.value)} />
                            </div>
                        ),
                    },
                    {
                        key: 'description',
                        title: t('description'),
                    },
                    {
                        key: 'options',
                        title: t('options'),
                        cell: ({ item: { id } }) => (
                            <Menu size="small">
                                <MenuItem onClick={async () => await handleArchive(id)}>
                                    <ArchiveIcon />{t('archive')}
                                </MenuItem>
                            </Menu>
                        ),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={setEditing}
                title={t('api_keys')}
                actions={
                    <Button
                        icon={<PlusIcon />}
                        size="small"
                        onClick={() => setEditing({ scope: 'public', role: 'support' })}
                    >
                        {t('create_key')}
                    </Button>
                }
            />
            <Modal
                title={editing?.id ? t('update_key') : t('create_key')}
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
            >
                {editing?.value && <Alert variant="plain" title="Key Value">{editing?.value}</Alert>}
                {
                    editing && (
                        <FormWrapper<ProjectApiKey>
                            onSubmit={
                                async ({ id, name, description, scope, role }) => {
                                    if (id) {
                                        await api.apiKeys.update(project.id, id, { name, description, role })
                                    } else {
                                        await api.apiKeys.create(project.id, { name, description, scope, role })
                                    }
                                    await state.reload()
                                    setEditing(null)
                                }
                            }
                            defaultValues={editing}
                            submitLabel={editing?.id ? t('update_key') : t('create_key')}
                        >
                            {
                                form => {
                                    const scope = form.watch('scope')
                                    return (
                                        <>
                                            <TextInput.Field
                                                form={form}
                                                name="name"
                                                label={t('name')}
                                                required
                                            />
                                            <TextInput.Field
                                                form={form}
                                                name="description"
                                                label={t('description')}
                                            />
                                            <RadioInput.Field
                                                form={form}
                                                name="scope"
                                                label={t('scope')}
                                                options={[
                                                    { key: 'public', label: 'Public' },
                                                    { key: 'secret', label: 'Secret' },
                                                ]}
                                                disabled={!!editing?.id}
                                            />
                                            {
                                                scope === 'secret' && (
                                                    <SingleSelect.Field
                                                        form={form}
                                                        name="role"
                                                        label={t('role')}
                                                        options={projectRoles}
                                                        getOptionDisplay={snakeToTitle}
                                                        required
                                                    />
                                                )
                                            }
                                        </>
                                    )
                                }
                            }
                        </FormWrapper>
                    )
                }
            </Modal>
        </>
    )
}
