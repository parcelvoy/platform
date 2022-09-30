import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import parse, { ImageMetadata } from './ImageStream'
import { allImages, uploadImage } from './ImageService'

const router = new Router<{
    app: App
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

export default router
