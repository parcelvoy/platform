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
import SwitchField from '../../ui/form/SwitchField'

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
                    {
                        key: 'is_public',
                        title: t('public'),
                        cell: ({ item }) => item.is_public ? t('yes') : t('no'),
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
                {editing && <FormWrapper<Pick<Subscription, 'id' | 'name' | 'channel' | 'is_public'>>
                    onSubmit={async ({ id, name, channel, is_public }) => {
                        if (id) {
                            await api.subscriptions.update(project.id, id, { name, is_public })
                        } else {
                            await api.subscriptions.create(project.id, { name, channel, is_public })
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
                                <SwitchField
                                    form={form}
                                    name="is_public"
                                    subtitle={t('public_desc')}
                                    label={t('public')}
                                />
                                {!editing.id && <SingleSelect.Field
                                    form={form}
                                    name="channel"
                                    label={t('channel')}
                                    options={['email', 'push', 'text', 'webhook', 'in_app'].map((channel) => ({ key: channel, label: snakeToTitle(channel) }))}
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
