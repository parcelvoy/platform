import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import api from '../../api'
import { SearchParams } from '../../types'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import PageContent from '../../ui/PageContent'
import ListTable from './ListTable'
import { PlusIcon } from '../../ui/icons'
import { ListCreateForm } from './ListCreateForm'
import { useTranslation } from 'react-i18next'

export default function Lists() {
    const { projectId = '' } = useParams()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const search = useCallback(async (params: SearchParams) => await api.lists.search(projectId, params), [api.lists, projectId])
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <PageContent
                title={t('lists')}
                actions={
                    <Button
                        icon={<PlusIcon />}
                        onClick={() => setIsModalOpen(true) }
                    >{t('create_list')}</Button>
                }
            >
                <ListTable search={search} />
            </PageContent>

            <Modal
                title={t('create_list')}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <ListCreateForm
                    onCreated={list => {
                        setIsModalOpen(false)
                        navigate(list.id.toString())
                    }}
                />
            </Modal>
        </>
    )
}
