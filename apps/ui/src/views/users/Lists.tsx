import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import api from '../../api'
import { ListCreateParams, SearchParams } from '../../types'
import Button from '../../ui/Button'
import OptionField from '../../ui/form/OptionField'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import ListTable from './ListTable'
import { createWrapperRule } from './RuleBuilder'
import { PlusIcon } from '../../ui/icons'
import { TagPicker } from '../settings/TagPicker'

export default function Lists() {
    const { projectId = '' } = useParams()
    const navigate = useNavigate()
    const search = useCallback(async (params: SearchParams) => await api.lists.search(projectId, params), [api.lists, projectId])
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <PageContent
                title="Lists"
                actions={
                    <Button
                        icon={<PlusIcon />}
                        onClick={() => setIsModalOpen(true) }
                    >
                        Create List
                    </Button>
                }
            >
                <ListTable search={search} />
            </PageContent>

            <Modal
                title="Create List"
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <FormWrapper<Omit<ListCreateParams, 'rule'>>
                    onSubmit={
                        async list => {
                            const { id } = await api.lists.create(projectId, {
                                ...list,
                                rule: list.type === 'dynamic' ? createWrapperRule() : undefined,
                            })
                            setIsModalOpen(false)
                            navigate(id.toString())
                        }
                    }
                    defaultValues={{ type: 'dynamic' }}
                    submitLabel="Save"
                >
                    {form => (
                        <>
                            <TextField
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
            </Modal>
        </>
    )
}
