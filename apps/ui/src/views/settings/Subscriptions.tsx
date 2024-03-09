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

export default function Subscriptions() {
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.subscriptions.search(project.id, params), [project]))
    const [editing, setEditing] = useState<null | Partial<Subscription>>(null)

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'name' },
                    {
                        key: 'channel',
                        cell: ({ item }) => snakeToTitle(item.channel),
                    },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={(row) => setEditing(row)}
                title="Subscriptions"
                actions={
                    <>
                        <Button
                            variant="primary"
                            icon={<PlusIcon />}
                            size="small"
                            onClick={() => setEditing({ channel: 'email' })}
                        >
                            Create Subscription
                        </Button>
                    </>
                }
            />
            <Modal
                title={editing ? 'Update Subscription' : 'Create Subscription' }
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
                                    label="Name"
                                />
                                {!editing.id && <SingleSelect.Field
                                    form={form}
                                    name="channel"
                                    label="Channel"
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
