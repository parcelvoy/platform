import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { getAdmin, pagedAdmins } from './AdminRepository'

const router = new Router({
    prefix: '/admins',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedAdmins(params)
})

router.get('/:adminId', async ctx => {
    ctx.body = await getAdmin(parseInt(ctx.params.adminId, 10))
})

export default router
