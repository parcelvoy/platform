import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { ProjectState } from '../auth/AuthMiddleware'
import { Admin } from '../auth/Admin'
import { addAdminToProject, pagedProjectAdmins, updateAdminProjectState } from './ProjectAdminRepository'

const router = new Router<
    ProjectState & { admin?: Admin }
>({
    prefix: '/admins',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProjectAdmins(params, ctx.state.project.id)
})

router.post('/', async ctx => {
    await addAdminToProject(ctx.state.project.id, ctx.request.body.admin_id)
    ctx.body = true
})

router.delete('/:adminId', async ctx => {
    await updateAdminProjectState(ctx.state.project.id, parseInt(ctx.params.adminId))
    ctx.body = true
})

export default router
