import Router from '@koa/router'
import App from '../app'
import { ProjectState } from '../auth/AuthMiddleware'
import UserDeleteJob from './UserDeleteJob'
import UserPatchJob from './UserPatchJob'
import { JSONSchemaType, validate } from '../core/validate'
import { UserParams } from './User'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { pagedUsers } from './UserRepository'

const router = new Router<ProjectState>({
    prefix: '/users',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedUsers(params, ctx.state.project.id)
})

const patchUsersRequest: JSONSchemaType<UserParams[]> = {
    $id: 'patchUsers',
    type: 'array',
    items: {
        type: 'object',
        required: [],
        properties: {
            anonymous_id: {
                type: 'string',
                nullable: true,
            },
            external_id: {
                type: 'string',
                nullable: true,
            },
            email: {
                type: 'string',
                nullable: true,
            },
            phone: {
                type: 'string',
                nullable: true,
            },
            data: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
            },
        },
        anyOf: [
            {
                required: ['anonymous_id'],
            },
            {
                required: ['external_id'],
            },
        ],
    },
    minItems: 1,
}
router.patch('/', async ctx => {
    const users = validate(patchUsersRequest, ctx.request.body)

    for (const user of users) {
        await App.main.queue.enqueue(UserPatchJob.from({
            project_id: ctx.state.project.id,
            user,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

const deleteUsersRequest: JSONSchemaType<string[]> = {
    type: 'array',
    items: {
        type: 'string',
    },
    minItems: 1,
}
router.delete('/users', async ctx => {

    let userIds = ctx.request.query.user_id || []
    if (!Array.isArray(userIds)) userIds = userIds.length ? [userIds] : []

    userIds = validate(deleteUsersRequest, userIds)

    for (const externalId of userIds) {
        await App.main.queue.enqueue(UserDeleteJob.from({
            project_id: ctx.state.project.id,
            external_id: externalId,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
