import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import parse, { ImageMetadata } from './ImageStream'
import { allImages, getImage, updateImage, uploadImage } from './ImageService'
import Image, { ImageParams } from './Image'

const router = new Router<{
    app: App
    image?: Image
    user: { project_id: number }
}>({
    prefix: '/images',
})

const uploadMetadata: JSONSchemaType<ImageMetadata> = {
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
            enum: ['image/jpeg', 'image/gif', 'image/png', 'image/jpg'],
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

    ctx.body = await uploadImage(ctx.state.user.project_id, stream)
})

router.get('/', async ctx => {
    ctx.body = await allImages(ctx.state.user.project_id)
})

router.param('imageId', async (value, ctx, next) => {
    ctx.state.image = await getImage(parseInt(ctx.params.imageId), ctx.state.user.project_id)
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
    ctx.body = await updateImage(ctx.params.imageId, payload)
})

export default router
