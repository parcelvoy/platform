import Router from '@koa/router'
import { JSONSchemaType } from 'ajv'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import { projectRoles } from './Project'
import { ProjectApiKey, ProjectApiKeyParams } from './ProjectApiKey'
import { createProjectApiKey, pagedApiKeys, projectRoleMiddleware, revokeProjectApiKey, updateProjectApiKey } from './ProjectService'

const router = new Router<
    ProjectState & { apiKey?: ProjectApiKey }
>({
    prefix: '/keys',
})

router.use(projectRoleMiddleware('admin'))

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedApiKeys(params, ctx.state.project.id)
})

const projectKeyParams: JSONSchemaType<ProjectApiKeyParams> = {
    $id: 'projectKeyCreate',
    type: 'object',
    required: ['name'],
    properties: {
        scope: {
            type: 'string',
            enum: ['public', 'secret'],
        },
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
            nullable: true,
        },
        role: {
            type: 'string',
            enum: projectRoles,
        },
    },
    additionalProperties: false,
}
router.post('/', async ctx => {
    const payload = validate(projectKeyParams, ctx.request.body)
    ctx.body = await createProjectApiKey(ctx.state.project.id, payload)
})

router.param('keyId', async (value, ctx, next) => {
    const apiKey = await ProjectApiKey.first(q => q
        .whereNull('deleted_at')
        .where('project_id', ctx.state.project.id)
        .where('id', parseInt(value, 10)),
    )
    if (!apiKey) {
        return ctx.throw(404)
    }
    ctx.state.apiKey = apiKey
    return next()
})

router.get('/:keyId', async ctx => {
    ctx.body = ctx.state.apiKey!
})

router.patch('/:keyId', async ctx => {
    ctx.body = await updateProjectApiKey(ctx.state.apiKey!.id, validate(projectKeyParams, ctx.request.body))
})

router.delete('/:keyId', async ctx => {
    ctx.body = await revokeProjectApiKey(parseInt(ctx.params.keyId, 10))
})

export default router
