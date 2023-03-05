import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { Subscription } from '../../types'
import TextField from '../../ui/form/TextField'
import { SelectField } from '../../ui/form/SelectField'
import Button from '../../ui/Button'

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
                    { key: 'channel' },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={(row) => navigate(`${row.id}`)}
                title='Subscriptions'
                actions={
                    <>
                        <Button
                            variant='primary'
                            icon='plus'
                            size='small'
                            onClick={() => setOpen(true)}
                        >
                            {'Create Subscription'}
                        </Button>
                    </>
                }
            />
            <Modal
                title='Create Subscription'
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
                                <TextField
                                    form={form}
                                    name='name'
                                    required
                                    label='Name'
                                />
                                <SelectField.Field
                                    form={form}
                                    name='channel'
                                    options={['email', 'push', 'text', 'webhook']}
                                />
                            </>
                        )
                    }
                </FormWrapper>
            </Modal>
        </>
    )
}
