import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    const navigate = useNavigate()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.subscriptions.search(project.id, params), [project]))
    const [open, setOpen] = useState(false)

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
                onSelectRow={(row) => navigate(`${row.id}`)}
                title="Subscriptions"
                actions={
                    <>
                        <Button
                            variant="primary"
                            icon={<PlusIcon />}
                            size="small"
                            onClick={() => setOpen(true)}
                        >
                            Create Subscription
                        </Button>
                    </>
                }
            />
            <Modal
                title="Create Subscription"
                open={open}
                onClose={() => setOpen(false)}
            >
                <FormWrapper<Pick<Subscription, 'name' | 'channel'>>
                    onSubmit={async ({ name, channel }) => {
                        await api.subscriptions.create(project.id, { name, channel })
                        await state.reload()
                        setOpen(false)
                    }}
                    defaultValues={{
                        channel: 'email',
                    }}
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
                                <SingleSelect.Field
                                    form={form}
                                    name="channel"
                                    label="Channel"
                                    options={['email', 'push', 'text', 'webhook'].map((channel) => ({ key: channel, label: snakeToTitle(channel) }))}
                                    toValue={x => x.key}
                                />
                            </>
                        )
                    }
                </FormWrapper>
            </Modal>
        </>
    )
}
