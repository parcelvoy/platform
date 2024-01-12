import Router from '@koa/router'
import { JSONSchemaType, validate } from '../core/validate'
import parse, { FileMetadata } from './FileStream'
import { getImage, pagedImages, updateImage, uploadImage } from './ImageService'
import Image, { ImageParams } from './Image'
import { ProjectState } from '../auth/AuthMiddleware'
import { extractQueryParams } from '../utilities'
import { SearchSchema } from '../core/searchParams'

const router = new Router<
    ProjectState & { image?: Image }
>({
    prefix: '/images',
})

const uploadMetadata: JSONSchemaType<FileMetadata> = {
    $id: 'uploadMetadata',
    type: 'object',
    required: ['fieldName', 'fileName', 'mimeType'],
    properties: {
        fieldName: {
            type: 'string',
        },
        fileName: {
            type: 'string',
        },
        mimeType: {
            type: 'string',
            enum: ['image/jpeg', 'image/gif', 'image/png', 'image/jpg', 'image/webp'],
        },
        size: {
            type: 'number',
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const stream = await parse(ctx)

    // Validate but we don't need the response since we already have it
    validate(uploadMetadata, stream.metadata)

    ctx.body = await uploadImage(ctx.state.project.id, stream)
})

router.get('/', async ctx => {
    const searchSchema = SearchSchema('imagesSearchSchema', {
        sort: 'id',
        direction: 'desc',
    })
    const params = extractQueryParams(ctx.query, searchSchema)
    ctx.body = await pagedImages(params, ctx.state.project.id)
})

router.param('imageId', async (value, ctx, next) => {
    ctx.state.image = await getImage(parseInt(value), ctx.state.project.id)
    if (!ctx.state.image) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:imageId', async ctx => {
    ctx.body = ctx.state.image
})

const imageUpdateMetadata: JSONSchemaType<ImageParams> = {
    $id: 'imageUpdateMetadata',
    type: 'object',
    required: ['name'],
    properties: {
        name: {
            type: 'string',
        },
        alt: {
            type: 'string',
            nullable: true,
        },
    },
    additionalProperties: false,
}

router.patch('/:imageId', async ctx => {
    const payload = validate(imageUpdateMetadata, ctx.request.body)
    ctx.body = await updateImage(ctx.state.image!.id, payload)
})

export default router
