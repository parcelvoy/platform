import Router from '@koa/router'
import { JSONSchemaType, validate } from '../core/validate'
import App from '../app'
import { Context } from 'koa'
import { JwtAdmin } from '../auth/AuthMiddleware'
import { deleteOrganization, getOrganization, organizationIntegrations, organizationRoleMiddleware, requireOrganizationRole, updateOrganization } from './OrganizationService'
import Organization, { OrganizationParams } from './Organization'
import { jobs } from '../config/queue'

const router = new Router<{
    admin: JwtAdmin
    organization: Organization
}>({
    prefix: '/organizations',
})

router.use(async (ctx: Context, next: () => void) => {
    ctx.state.organization = await getOrganization(ctx.state.admin.organization_id)
    return next()
})

router.get('/', async ctx => {
    ctx.body = ctx.state.organization
})

router.use(organizationRoleMiddleware('admin'))

router.get('/performance/queue', async ctx => {
    ctx.body = await App.main.queue.metrics()
})

router.get('/performance/jobs', async ctx => {
    ctx.body = jobs.map(job => job.$name)
})

router.get('/performance/jobs/:job', async ctx => {
    const jobName = ctx.params.job

    const added = await App.main.stats.list(jobName)
    const completed = await App.main.stats.list(`${jobName}:completed`)
    const duration = await App.main.stats.list(`${jobName}:duration`)
    const average = duration.map((item, index) => {
        const count = completed[index]?.count
        return {
            date: item.date,
            count: count ? item.count / count : 0,
        }
    })

    ctx.body = {
        throughput: [
            {
                label: 'added',
                data: added,
            },
            {
                label: 'completed',
                data: completed,
            },
        ],
        timing: [
            {
                label: 'average',
                data: average,
            },
        ],
    }
})

router.get('/performance/failed', async ctx => {
    ctx.body = await App.main.queue.failed()
})

router.get('/integrations', async ctx => {
    ctx.body = await organizationIntegrations(ctx.state.organization)
})

const organizationUpdateParams: JSONSchemaType<OrganizationParams> = {
    $id: 'organizationUpdate',
    type: 'object',
    required: ['username'],
    properties: {
        username: { type: 'string' },
        domain: {
            type: 'string',
            nullable: true,
        },
        tracking_deeplink_mirror_url: {
            type: 'string',
            nullable: true,
        },
    },
    additionalProperties: false,
}
router.patch('/:id', async ctx => {
    requireOrganizationRole(ctx.state.admin!, 'owner')
    const payload = validate(organizationUpdateParams, ctx.request.body)
    ctx.body = await updateOrganization(ctx.state.organization, payload)
})

router.delete('/', async ctx => {
    requireOrganizationRole(ctx.state.admin!, 'owner')
    await deleteOrganization(ctx.state.organization)
    ctx.body = true
})

export default router
