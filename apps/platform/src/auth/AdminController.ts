import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { getAdmin, pagedAdmins } from './AdminRepository'
import { AuthState } from './AuthMiddleware'

const router = new Router<AuthState>({
    prefix: '/admins',
})

router.get('/', async ctx => {
    const organizationId = ctx.state.admin!.organization_id
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedAdmins(organizationId, params)
})

router.get('/:adminId', async ctx => {
    const organizationId = ctx.state.admin!.organization_id
    ctx.body = await getAdmin(parseInt(ctx.params.adminId, 10), organizationId)
})

export default router
