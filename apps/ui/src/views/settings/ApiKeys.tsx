import { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { ProjectApiKey, ProjectApiKeyParams } from '../../types'
import Button from '../../ui/Button'
import OptionField from '../../ui/form/OptionField'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'

export default function ProjectApiKeys() {

    const navigate = useNavigate()
    const [project] = useContext(ProjectContext)
    const state = useSearchTableState(useCallback(async params => await api.apiKeys.search(project.id, params), [project]))

    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <SearchTable
                {...state}
                columns={[
                    { key: 'name' },
                    { key: 'scope' },
                    { key: 'value' },
                    { key: 'description' },
                ]}
                itemKey={({ item }) => item.id}
                onSelectRow={(row: ProjectApiKey) => navigate(`${row.id}`)}
                title='API Keys'
                actions={
                    <Button icon="plus-lg" size="small" onClick={() => setIsModalOpen(true)}>
                        Create Key
                    </Button>
                }
            />
            <Modal
                title="Create API Key"
                open={isModalOpen}
                onClose={setIsModalOpen}
            >
                <FormWrapper<ProjectApiKeyParams>
                    onSubmit={
                        async key => {
                            await api.apiKeys.create(project.id, key as ProjectApiKey)
                            await state.reload()
                            setIsModalOpen(false)
                        }
                    }
                    defaultValues={{ scope: 'public' }}
                    submitLabel="Create"
                >
                    {form => <>
                        <TextField form={form} name="name" label="Name" required />
                        <TextField form={form} name="description" label="Description" />
                        <OptionField
                            form={form}
                            name="scope"
                            label="Scope"
                            options={[
                                { key: 'public', label: 'Public' },
                                { key: 'secret', label: 'Secret' },
                            ]}/>
                    </>}
                </FormWrapper>
            </Modal>
        </>
    )
}
