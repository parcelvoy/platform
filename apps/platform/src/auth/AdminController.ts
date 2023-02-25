import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { pagedAdmins } from './AdminRepository'

const router = new Router({
    prefix: '/admins',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedAdmins(params)
})

export default router
