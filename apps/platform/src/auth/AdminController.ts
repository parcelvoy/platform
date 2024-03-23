import Router from '@koa/router'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { createOrUpdateAdmin, getAdmin, pagedAdmins } from './AdminRepository'
import { AuthState } from './AuthMiddleware'
import { Context } from 'koa'
import { getOrganization, organizationRoleMiddleware } from '../organizations/OrganizationService'
import Admin from './Admin'
import { organizationRoles } from '../organizations/Organization'
import { JSONSchemaType, validate } from '../core/validate'

const router = new Router<
    AuthState & { admin?: Admin }
>({
    prefix: '/organizations/admins',
})

router.use(async (ctx: Context, next: () => void) => {
    ctx.state.organization = await getOrganization(ctx.state.admin.organization_id)
    return next()
})

router.use(organizationRoleMiddleware('admin'))

router.get('/', async ctx => {
    const organizationId = ctx.state.admin!.organization_id
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedAdmins(organizationId, params)
})

const orgAdminCreateAdminParamsSchema: JSONSchemaType<Pick<Admin, 'email' | 'role' | 'first_name'>> = {
    $id: 'orgAdminCreateAdminParams',
    type: 'object',
    required: ['role', 'email'],
    properties: {
        email: {
            type: 'string',
            format: 'email',
        },
        role: {
            type: 'string',
            enum: organizationRoles,
        },
        first_name: { type: 'string', nullable: true },
    },
}
router.post('/', async ctx => {
    const { role, email, first_name } = validate(orgAdminCreateAdminParamsSchema, ctx.request.body)
    ctx.body = await createOrUpdateAdmin({
        organization_id: ctx.state.admin!.organization_id,
        email,
        role,
        first_name,
    })
})

router.param('adminId', async (value, ctx, next) => {
    ctx.state.admin = await getAdmin(parseInt(value, 10), ctx.state.admin!.organization_id)
    if (!ctx.state.admin) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:adminId', async ctx => {
    ctx.body = ctx.state.admin
})

export default router
