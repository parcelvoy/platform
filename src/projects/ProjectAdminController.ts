import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { ProjectState } from '../auth/AuthMiddleware'
import { Admin } from '../auth/Admin'
import { pagedProjectAdmins } from './ProjectAdminRepository'

const router = new Router<
    ProjectState & { admin?: Admin }
>({
    prefix: '/admins',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProjectAdmins(params, ctx.state.project.id)
})

export default router
