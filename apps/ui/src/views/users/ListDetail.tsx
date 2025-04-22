import { useCallback, useContext, useEffect, useState } from 'react'
import api from '../../api'
import { ListContext, ProjectContext } from '../../contexts'
import { DynamicList, ListUpdateParams, Rule } from '../../types'
import Button from '../../ui/Button'
import Heading from '../../ui/Heading'
import Dialog from '../../ui/Dialog'
import PageContent from '../../ui/PageContent'
import RuleBuilder from './RuleBuilder'
import Modal from '../../ui/Modal'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import { ListTag } from './ListTable'
import { InfoTable } from '../../ui/InfoTable'
import { snakeToTitle } from '../../utils'
import UploadField from '../../ui/form/UploadField'
import { SearchTable, useSearchTableState } from '../../ui/SearchTable'
import { useRoute } from '../router'
import { ArchiveIcon, EditIcon, RestartIcon, SendIcon, UploadIcon } from '../../ui/icons'
import { TagPicker } from '../settings/TagPicker'
import { useTranslation } from 'react-i18next'
import { Alert, Menu, MenuItem } from '../../ui'
import { useBlocker } from 'react-router-dom'

interface RuleSectionProps {
    list: DynamicList
    onRuleSave: (rule: Rule) => void
    onChange?: (rule: Rule) => void
}

const RuleSection = ({ list, onRuleSave, onChange }: RuleSectionProps) => {
    const { t } = useTranslation()
    const [rule, setRule] = useState<Rule>(list.rule)
    const onSetRule = (rule: Rule) => {
        setRule(rule)
        onChange?.(rule)
    }
    return <>
        <Heading size="h3" title={t('rules')} actions={
            <Button size="small" onClick={() => onRuleSave(rule) }>{t('rules_save')}</Button>
        } />
        <RuleBuilder rule={rule} setRule={onSetRule} />
    </>
}

export default function ListDetail() {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)
    const [list, setList] = useContext(ListContext)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditListOpen, setIsEditListOpen] = useState(false)
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [error, setError] = useState<string | undefined>()

    const state = useSearchTableState(useCallback(async params => await api.lists.users(project.id, list.id, params), [list, project]))
    const route = useRoute()

    useEffect(() => {
        const refresh = () => {
            api.lists.get(project.id, list.id)
                .then(setList)
                .then(() => state.reload)
                .catch(() => {})
        }

        if (list.state !== 'loading') return
        const complete = list.progress?.complete ?? 0
        const total = list.progress?.total ?? 0
        const percent = total > 0 ? complete / total * 100 : 0
        const refreshRate = percent < 5 ? 1000 : 5000
        const interval = setInterval(refresh, refreshRate)
        refresh()

        return () => clearInterval(interval)
    }, [list.state])

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
    )

    useEffect(() => {
        if (blocker.state !== 'blocked') return
        if (confirm(t('confirm_unsaved_changes'))) {
            blocker.proceed()
        } else {
            blocker.reset()
        }
    }, [blocker.state])

    const saveList = async ({ name, rule, published, tags }: ListUpdateParams) => {
        try {
            const value = await api.lists.update(project.id, list.id, { name, rule, published, tags })
            setError(undefined)
            setList(value)
            setIsEditListOpen(false)
            setIsDialogOpen(true)
            setHasUnsavedChanges(false)
        } catch (error: any) {
            const errorMessage = error.response?.data?.error ?? error.message
            setError(errorMessage)
            setIsEditListOpen(false)
        }
    }

    const uploadUsers = async (file: FileList) => {
        await api.lists.upload(project.id, list.id, file[0])
        setIsUploadOpen(false)
        await state.reload()
    }

    const handleRecountList = async () => {
        await api.lists.recount(project.id, list.id)
        window.location.reload()
    }

    const handleArchiveList = async () => {
        await api.lists.delete(project.id, list.id)
        window.location.href = `/projects/${project.id}/lists`
    }

    return (
        <PageContent
            title={list.name}
            desc={
                <InfoTable rows={{
                    [t('state')]: <ListTag state={list.state} progress={list.progress} />,
                    [t('type')]: snakeToTitle(list.type),
                    [t('users_count')]: list.state === 'loading'
                        ? <>&#8211;</>
                        : list.users_count?.toLocaleString(),
                }} direction="horizontal" />
            }
            actions={
                <>
                    {list.state === 'draft' && <Button
                        icon={<SendIcon />}
                        onClick={async () => await saveList({ name: list.name, published: true })}>{t('publish')}</Button>}
                    {list.type === 'static' && <Button
                        variant="secondary"
                        icon={<UploadIcon />}
                        onClick={() => setIsUploadOpen(true)}
                    >{t('upload_list')}</Button>}
                    <Button icon={<EditIcon />} onClick={() => setIsEditListOpen(true)}>{t('edit_list')}</Button>
                    <Menu size="regular">
                        <MenuItem onClick={async () => await handleRecountList()}>
                            <RestartIcon />{t('recount')}
                        </MenuItem>
                        <MenuItem onClick={async () => await handleArchiveList()}>
                            <ArchiveIcon />{t('archive')}
                        </MenuItem>
                    </Menu>
                </>
            }>

            {error && <Alert variant="error" title="Error">{error}</Alert>}

            {list.type === 'dynamic' && (
                <RuleSection
                    list={list}
                    onRuleSave={async (rule: any) => await saveList({ name: list.name, rule })}
                    onChange={() => setHasUnsavedChanges(true)} />
            )}

            <SearchTable title="Users"
                {...state}
                columns={[
                    { key: 'full_name', title: t('name') },
                    { key: 'email', title: t('email'), sortable: true },
                    { key: 'phone', title: t('phone') },
                    {
                        key: 'created_at',
                        title: t('joined_list_at'),
                        sortable: true,
                        sortKey: 'user_list.created_at',
                    },
                ]}
                onSelectRow={({ id }) => route(`users/${id}`)} />

            <Dialog
                open={isDialogOpen}
                onClose={setIsDialogOpen}
                title="Success">
                {t('list_generation_dialog_description')}
            </Dialog>

            <Modal
                open={isEditListOpen}
                onClose={() => setIsEditListOpen(false)}
                title={t('edit_list')}>
                <FormWrapper<Omit<ListUpdateParams, 'rule'>>
                    onSubmit={async ({ name, published, tags }) => await saveList({ name, published, tags })}
                    submitLabel={t('save')}
                    defaultValues={{ name: list.name, tags: list.tags }}
                >
                    {form => (
                        <>
                            <TextInput.Field
                                form={form}
                                name="name"
                                label={t('list_name')}
                                required
                            />
                            <TagPicker.Field
                                form={form}
                                name="tags"
                                label={t('tags')}
                            />
                        </>
                    )}
                </FormWrapper>
            </Modal>

            <Modal
                open={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                title={t('import_users')}>
                <FormWrapper<{ file: FileList }>
                    onSubmit={async (form) => await uploadUsers(form.file)}
                    submitLabel={t('upload')}
                >
                    {form => <>
                        <p>{t('upload_instructions')}</p>
                        <UploadField form={form} name="file" label={t('file')} required />
                    </>}
                </FormWrapper>
            </Modal>
        </PageContent>
    )
}
