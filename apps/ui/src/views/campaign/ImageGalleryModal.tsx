import Modal, { ModalStateProps } from '../../ui/Modal'
import UploadField from '../../ui/form/UploadField'
import { useSearchTableState } from '../../ui/SearchTable'
import { useCallback, useContext, useState } from 'react'
import { ProjectContext } from '../../contexts'
import api from '../../api'
import './ImageGalleryModal.css'
import { Image } from '../../types'

interface ImageGalleryProps extends ModalStateProps {
    onInsert?: (image: Image) => void
}

export default function ImageGalleryModal({ open, onClose, onInsert }: ImageGalleryProps) {
    const [project] = useContext(ProjectContext)
    const { reload, results } = useSearchTableState(useCallback(async params => await api.images.search(project.id, params), [project]))
    const [upload, setUpload] = useState<FileList | undefined>()

    const uploadImage = async (image: FileList) => {
        setUpload(image)
        await api.images.create(project.id, image[0])
        await reload()
        setUpload(undefined)
    }

    return (
        <Modal
            title="Images"
            open={open}
            onClose={onClose}
            size="large">
            <div className="image-gallery">
                <p>Click or drag file in to upload a new image. Note, files are uploaded at their original resolution and filesize.</p>
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
        </Modal>
    )
}
