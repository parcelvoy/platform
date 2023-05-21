import App from '../app'
import { snakeCase } from '../utilities'
import Image, { ImageParams } from './Image'
import { FileStream } from './FileStream'
import { PageParams } from '../core/searchParams'

export const uploadImage = async (projectId: number, stream: FileStream): Promise<Image> => {
    const upload = await App.main.storage.save(stream)
    return await Image.insertAndFetch({
        project_id: projectId,
        name: upload.original_name ? snakeCase(upload.original_name) : '',
        ...upload,
    })
}

export const allImages = async (projectId: number): Promise<Image[]> => {
    return await Image.all(qb => qb.where('project_id', projectId))
}

export const pagedImages = async (params: PageParams, projectId: number) => {
    return await Image.search(
        { ...params, fields: ['name'] },
        b => b.where('project_id', projectId),
    )
}

export const getImage = async (projectId: number, id: number): Promise<Image | undefined> => {
    return await Image.find(id, qb => qb.where('project_id', projectId))
}

export const updateImage = async (id: number, params: ImageParams): Promise<Image | undefined> => {
    return await Image.updateAndFetch(id, params)
}
