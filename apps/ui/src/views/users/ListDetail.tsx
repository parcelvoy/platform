import { useCallback, useContext, useState } from 'react'
import api from '../../api'
import { ListContext, ProjectContext } from '../../contexts'
import { DynamicList, ListUpdateParams, WrapperRule } from '../../types'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import Dialog from '../../ui/Dialog'
import PageContent from '../../ui/PageContent'
import RuleBuilder from './RuleBuilder'
import Modal from '../../ui/Modal'
import FormWrapper from '../../ui/form/FormWrapper'
import TextField from '../../ui/form/TextField'
import { ListTag } from './ListTable'
import { InfoTable } from '../../ui/InfoTable'
import { snakeToTitle } from '../../utils'
import UploadField from '../../ui/form/UploadField'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { useRoute } from '../router'
import { EditIcon, UploadIcon } from '../../ui/icons'
import { TagPicker } from '../settings/TagPicker'

const RuleSection = ({ list, onRuleSave }: { list: DynamicList, onRuleSave: (rule: WrapperRule) => void }) => {
    const [rule, setRule] = useState<WrapperRule>(list.rule)
    return <>
        <Heading size="h3" title="Rules" actions={
            <Button size="small" onClick={() => onRuleSave(rule) }>Save Rules</Button>
        } />
        <RuleBuilder rule={rule} setRule={setRule} />
    </>
}

export default function ListDetail() {
    const [project] = useContext(ProjectContext)
    const [list, setList] = useContext(ListContext)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditListOpen, setIsEditListOpen] = useState(false)
    const [isUploadOpen, setIsUploadOpen] = useState(false)

    const state = useSearchTableState(useCallback(async params => await api.lists.users(project.id, list.id, params), [list, project]))
    const route = useRoute()

    const saveList = async ({ name, rule }: ListUpdateParams) => {
        const value = await api.lists.update(project.id, list.id, { name, rule })
        setIsEditListOpen(false)
        setIsDialogOpen(true)
        setList(value)
    }

    const uploadUsers = async (file: FileList) => {
        await api.lists.upload(project.id, list.id, file[0])
        setIsUploadOpen(false)
    }

    return (
        <PageContent
            title={list.name}
            desc={
                <InfoTable rows={{
                    state: <ListTag state={list.state} />,
                    type: snakeToTitle(list.type),
                    users_count: list.users_count,
                }} direction="horizontal" />
            }
            actions={
                <>
                    {list.type === 'static' && <Button
                        variant="secondary"
                        icon={<UploadIcon />}
                        onClick={() => setIsUploadOpen(true)}
                    >Upload List</Button>}
                    <Button icon={<EditIcon />} onClick={() => setIsEditListOpen(true)}>Edit List</Button>
                </>
            }>

            {list.type === 'dynamic' && <RuleSection list={list} onRuleSave={async (rule) => await saveList({ name: list.name, rule })} />}

            <SearchTable title="Users"
                {...state}
                columns={[
                    { key: 'full_name', title: 'Name' },
                    { key: 'email' },
                    { key: 'phone' },
                    { key: 'created_at' },
                    { key: 'updated_at' },
                ]}
                onSelectRow={({ id }) => route(`users/${id}`)} />

            <Dialog
                open={isDialogOpen}
                onClose={setIsDialogOpen}
                title="Success">
                List generation will happen in the background. Please reload the page to see the latest status.
            </Dialog>

            <Modal
                open={isEditListOpen}
                onClose={() => setIsEditListOpen(false)}
                title="Edit List">
                <FormWrapper<Omit<ListUpdateParams, 'rule'>>
                    onSubmit={async ({ name }) => await saveList({ name })}
                    submitLabel="Save"
                    defaultValues={{ name: list.name }}
                >
                    {form => (
                        <>
                            <TextField
                                form={form}
                                name="name"
                                label="List Name"
                                required
                            />
                            <TagPicker.Field
                                form={form}
                                name="tags"
                            />
                        </>
                    )}
                </FormWrapper>
            </Modal>

            <Modal
                open={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                title="Import Users">
                <FormWrapper<{ file: FileList }>
                    onSubmit={async (form) => await uploadUsers(form.file)}
                    submitLabel="Upload"
                >
                    {form => <>
                        <p>Please select a CSV of users to upload. The provided file must have the external ID you wish to use for each user.</p>
                        <UploadField form={form} name="file" label="File" required />
                    </>}
                </FormWrapper>
            </Modal>
        </PageContent>
    )
}
