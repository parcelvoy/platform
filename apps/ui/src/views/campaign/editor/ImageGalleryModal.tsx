import Modal, { ModalStateProps } from '../../../ui/Modal'
import UploadField from '../../../ui/form/UploadField'
import { useSearchTableState } from '../../../ui/SearchTable'
import { useCallback, useContext, useState } from 'react'
import { ProjectContext } from '../../../contexts'
import api from '../../../api'
import './ImageGalleryModal.css'
import { Image } from '../../../types'
import { Tabs } from '../../../ui'
import TextInput from '../../../ui/form/TextInput'
import FormWrapper from '../../../ui/form/FormWrapper'
import { useTranslation } from 'react-i18next'

export type ImageUpload = Pick<Image, 'url' | 'alt' | 'name'>

interface OnInsert {
    onInsert: (image: ImageUpload) => void
}

type ImageGalleryProps = ModalStateProps & OnInsert

const Gallery = ({ onInsert }: OnInsert) => {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const { reload, results } = useSearchTableState(useCallback(async params => await api.images.search(project.id, params), [project]))
    const [upload, setUpload] = useState<FileList | undefined>()

    const uploadImage = async (image: FileList) => {
        setUpload(image)
        await api.images.create(project.id, image[0])
        await reload()
        setUpload(undefined)
    }

    return (
        <div className="image-gallery">
            <p>{t('image_upload')}</p>
            <UploadField
                value={upload}
                onChange={uploadImage}
                name="file"
                label="File"
                isUploading={upload !== undefined}
                accept={'image/*'}
                required />

            {results && <div className="images">
                {results.results.map(image => <>
                    <div className="image"
                        key={`image-${image.id}`}
                        onClick={() => onInsert?.(image) }>
                        <img src={image.url} alt={image.alt} />
                    </div>
                </>)}
            </div>}
        </div>
    )
}

interface URLParams {
    url: string
}

const URL = ({ onInsert }: OnInsert) => {
    const { t } = useTranslation()
    const handleSubmit = async (params: URLParams) => {
        onInsert({
            url: params.url,
            alt: '',
            name: params.url.split('/').pop() ?? 'Image',
        })
    }

    return (
        <div className="image-gallery">
            <FormWrapper<URLParams>
                onSubmit={handleSubmit}
                submitLabel={t('save')}>
                {form => <>
                    <p>{t('image_url')}</p>
                    <TextInput.Field form={form} name="url" label="Image URL" />
                </>}
            </FormWrapper>
        </div>
    )
}

export default function ImageGalleryModal({ open, onClose, onInsert }: ImageGalleryProps) {
    const tabs = [
        {
            key: 'gallery',
            label: 'Gallery',
            children: <Gallery onInsert={onInsert} />,
        },
        {
            key: 'url',
            label: 'URL',
            children: <URL onInsert={onInsert} />,
        },
    ]

    return (
        <Modal
            title="Images"
            open={open}
            onClose={onClose}
            size="large">
            <Tabs tabs={tabs} />
        </Modal>
    )
}
