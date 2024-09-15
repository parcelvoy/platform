import Modal, { ModalStateProps } from '../../ui/Modal'
import './ImageGalleryModal.css'
import { Font, Resource } from '../../types'
import { useTranslation } from 'react-i18next'
import FormWrapper from '../../ui/form/FormWrapper'
import TextInput from '../../ui/form/TextInput'
import api from '../../api'
import { useContext } from 'react'
import { ProjectContext } from '../../contexts'

interface ResourceModalProps extends ModalStateProps {
    onInsert?: (resource: Resource) => void
}

export default function ResourceFontModal({ open, onClose, onInsert }: ResourceModalProps) {
    const { t } = useTranslation()
    const [project] = useContext(ProjectContext)

    const handleCreateFont = async (params: Font) => {
        const resource = await api.resources.create(project.id, {
            type: 'font',
            name: params.name,
            value: params,
        })
        onInsert?.(resource)
    }

    return (
        <Modal
            title={t('add_font')}
            open={open}
            onClose={onClose}
            size="small">
            <FormWrapper<Font>
                onSubmit={async (params) => { await handleCreateFont(params) }}
                submitLabel={t('create')}>
                {form => <>
                    <TextInput.Field
                        form={form}
                        name="name"
                        label={t('name')}
                        required />
                    <TextInput.Field
                        form={form}
                        name="value"
                        label="Font Family"
                        required />
                    <TextInput.Field
                        form={form}
                        name="url"
                        label="URL"
                        required />
                </>}
            </FormWrapper>
        </Modal>
    )
}
