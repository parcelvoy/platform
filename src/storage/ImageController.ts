import Router from '@koa/router'
import type App from '../app'
import parse from './ImageStream'
import { upload } from './ImageService'

const router = new Router<{
    app: App
}>({
    prefix: '/images',
})

router.post('/', async ctx => {
    const stream = await parse(ctx.req)
    ctx.body = await upload(stream)
})
