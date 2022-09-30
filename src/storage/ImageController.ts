import Router from '@koa/router'
import type App from '../app'
import parse from './ImageStream'
import { allImages, uploadImage } from './ImageService'

const router = new Router<{
    app: App
    user: { project_id: number }
}>({
    prefix: '/images',
})

router.post('/', async ctx => {
    const stream = await parse(ctx)
    ctx.body = await uploadImage(ctx.state.user.project_id, stream)
})

router.get('/', async ctx => {
    ctx.body = await allImages(ctx.state.user.project_id)
})

export default router
