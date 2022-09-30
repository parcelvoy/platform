import App from '../app'
import Image from './Image'
import { ImageStream } from './ImageStream'

export const uploadImage = async (projectId: number, stream: ImageStream): Promise<Image> => {
    const upload = await App.main.storage.upload(stream)
    return await Image.insertAndFetch({ project_id: projectId, ...upload })
}

export const allImages = async (projectId: number): Promise<Image[]> => {
    return await Image.all(qb => qb.where('project_id', projectId))
}
