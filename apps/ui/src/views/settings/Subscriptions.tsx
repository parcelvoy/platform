import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { Subscription } from '../../types'
import TextInput from '../../ui/form/TextInput'
import { SingleSelect } from '../../ui/form/SingleSelect'
import Button from '../../ui/Button'
import { PlusIcon } from '../../ui/icons'
import { snakeToTitle } from '../../utils'
import { useTranslation } from 'react-i18next'

export default function Subscriptions() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.subscriptions.search(project.id, params), [project]))
    const [editing, setEditing] = useState<null | Partial<Subscription>>(null)

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'name', title: t('name') },
                    {
                        key: 'channel',
                        title: t('channel'),
                        cell: ({ item }) => snakeToTitle(item.channel),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={(row) => setEditing(row)}
                title={t('subscriptions')}
                actions={
                    <>
                        <Button
                            variant="primary"
                            icon={<PlusIcon />}
                            size="small"
                            onClick={() => setEditing({ channel: 'email' })}
                        >{t('create_subscription')}</Button>
                    </>
                }
            />
            <Modal
                title={editing ? t('update_subscription') : t('create_subscription') }
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
            >
                {editing && <FormWrapper<Pick<Subscription, 'id' | 'name' | 'channel'>>
                    onSubmit={async ({ id, name, channel }) => {
                        if (id) {
                            await api.subscriptions.update(project.id, id, { name })
                        } else {
                            await api.subscriptions.create(project.id, { name, channel })
                        }
                        await state.reload()
                        setEditing(null)
                    }}
                    defaultValues={editing}
                >
                    {
                        form => (
                            <>
                                <TextInput.Field
                                    form={form}
                                    name="name"
                                    required
                                    label={t('name')}
                                />
                                {!editing.id && <SingleSelect.Field
                                    form={form}
                                    name="channel"
                                    label={t('channel')}
                                    options={['email', 'push', 'text', 'webhook'].map((channel) => ({ key: channel, label: snakeToTitle(channel) }))}
                                    toValue={x => x.key}
                                />}
                            </>
                        )
                    }
                </FormWrapper>}
            </Modal>
        </>
    )
}
