import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { ProjectState } from '../auth/AuthMiddleware'
import { addAdminToProject, getProjectAdmin, pagedProjectAdmins, removeAdminFromProject } from './ProjectAdminRepository'
import { JSONSchemaType } from 'ajv'
import Admin from '../auth/Admin'
import { validate } from '../core/validate'
import { projectRoleMiddleware } from './ProjectService'
import { ProjectAdminParams } from './ProjectAdmins'
import { projectRoles } from './Project'
import { RequestError } from '../core/errors'
import { createOrUpdateAdmin } from '../auth/AdminRepository'

const router = new Router<
    ProjectState & { admin?: Admin }
>({
    prefix: '/admins',
})

router.use(projectRoleMiddleware('admin'))

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProjectAdmins(params, ctx.state.project.id)
})

const projectCreateAdminParamsSchema: JSONSchemaType<ProjectAdminParams & { email: string }> = {
    $id: 'projectCreateAdminParams',
    type: 'object',
    required: ['role', 'email'],
    properties: {
        email: {
            type: 'string',
            format: 'email',
        },
        role: {
            type: 'string',
            enum: projectRoles,
        },
    },
}

router.post('/', async ctx => {
    const organizationId = ctx.state.project.organization_id
    const { role, email } = validate(projectCreateAdminParamsSchema, ctx.request.body)
    const admin = await createOrUpdateAdmin({
        organization_id: organizationId,
        email,
        role: 'member',
    })
    if (ctx.state.admin!.id === admin.id) throw new RequestError('You cannot add yourself to a project')
    await addAdminToProject(ctx.state.project.id, admin.id, role)
    ctx.body = await getProjectAdmin(ctx.state.project.id, admin.id)
})

const projectAdminParamsSchema: JSONSchemaType<ProjectAdminParams> = {
    $id: 'projectAdminParams',
    type: 'object',
    required: ['role'],
    properties: {
        role: {
            type: 'string',
            enum: projectRoles,
        },
    },
}

router.put('/:adminId', async ctx => {
    const admin = await Admin.find(ctx.params.adminId)
    if (!admin) throw new RequestError('Invalid admin ID', 404)
    const { role } = validate(projectAdminParamsSchema, ctx.request.body)
    if (ctx.state.admin!.id === admin.id) throw new RequestError('You cannot add yourself to a project')
    await addAdminToProject(ctx.state.project.id, admin.id, role)
    ctx.body = await getProjectAdmin(ctx.state.project.id, admin.id)
})

router.get('/:adminId', async ctx => {
    const projectAdmin = await getProjectAdmin(ctx.state.project.id, parseInt(ctx.params.adminId, 10))
    if (!projectAdmin) return ctx.throw(404)
    ctx.body = projectAdmin
})

router.delete('/:adminId', async ctx => {
    await removeAdminFromProject(ctx.state.project.id, parseInt(ctx.params.adminId, 10))
    ctx.body = true
})

export default router
