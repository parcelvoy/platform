import Router from '@koa/router'
import App from '../app'
import { ProjectState } from '../auth/AuthMiddleware'
import UserDeleteJob from './UserDeleteJob'
import UserPatchJob from './UserPatchJob'
import parse from '../storage/FileStream'
import { JSONSchemaType, validate } from '../core/validate'
import { User, UserParams } from './User'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema, SearchSchema } from '../core/searchParams'
import { getUser, getUserFromContext, pagedUsers } from './UserRepository'
import { getUserSubscriptions, toggleSubscription } from '../subscriptions/SubscriptionService'
import { SubscriptionState } from '../subscriptions/Subscription'
import { getUserEvents } from './UserEventRepository'
import { projectRoleMiddleware } from '../projects/ProjectService'
import { pagedEntrancesByUser } from '../journey/JourneyRepository'
import { removeUsers } from './UserImport'
import { filterObjectForRulePaths } from '../projects/ProjectRulePathRepository'
import { RulePathVisibility } from '../rules/ProjectRulePath'

const router = new Router<
    ProjectState & { user?: User }
>({
    prefix: '/users',
})

router.get('/', async ctx => {
    const searchSchema = SearchSchema('usersSearchSchema', {
        sort: 'id',
        direction: 'desc',
    })
    const params = extractQueryParams(ctx.query, searchSchema)
    ctx.body = await pagedUsers(params, ctx.state.project.id)
})

const patchUsersRequest: JSONSchemaType<UserParams[]> = {
    $id: 'patchUsers',
    type: 'array',
    items: {
        anyOf: [{
            type: 'object',
            required: ['anonymous_id'],
            properties: {
                anonymous_id: {
                    type: 'string',
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
                timezone: {
                    type: 'string',
                    nullable: true,
                },
                locale: {
                    type: 'string',
                    nullable: true,
                },
                data: {
                    type: 'object',
                    nullable: true,
                    additionalProperties: true,
                },
            },
        },
        {
            type: 'object',
            required: ['external_id'],
            properties: {
                anonymous_id: {
                    type: 'string',
                    nullable: true,
                },
                external_id: {
                    type: 'string',
                },
                email: {
                    type: 'string',
                    nullable: true,
                },
                phone: {
                    type: 'string',
                    nullable: true,
                },
                timezone: {
                    type: 'string',
                    nullable: true,
                },
                locale: {
                    type: 'string',
                    nullable: true,
                },
                data: {
                    type: 'object',
                    nullable: true,
                    additionalProperties: true,
                },
            },
        }],
    },
    minItems: 1,
}
router.patch('/', projectRoleMiddleware('editor'), async ctx => {
    const users = validate(patchUsersRequest, ctx.request.body)

    const jobs = users.map(user => UserPatchJob.from({
        project_id: ctx.state.project.id,
        user,
    }))
    await App.main.queue.enqueueBatch(jobs)

    ctx.status = 204
    ctx.body = ''
})

router.post('/delete', async ctx => {
    const stream = await parse(ctx)

    await removeUsers({
        project_id: ctx.state.project.id,
        stream,
    })

    ctx.status = 204
})

const deleteUsersRequest: JSONSchemaType<string[]> = {
    $id: 'deleteUsers',
    type: 'array',
    items: {
        type: 'string',
    },
    minItems: 1,
}
router.delete('/', projectRoleMiddleware('editor'), async ctx => {

    let userIds = ctx.request.query.user_id || []
    if (!Array.isArray(userIds)) userIds = userIds.length ? [userIds] : []

    userIds = validate(deleteUsersRequest, userIds)

    for (const externalId of userIds) {
        await UserDeleteJob.from({
            project_id: ctx.state.project.id,
            external_id: externalId,
        }).queue()
    }

    ctx.status = 204
    ctx.body = ''
})

router.param('userId', async (value, ctx, next) => {
    ctx.state.user = await getUserFromContext(ctx)
    if (!ctx.state.user) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:userId', async ctx => {
    const visibilities: RulePathVisibility[] = ctx.state.projectRole === 'admin'
        ? ['public', 'classified']
        : ['public']

    ctx.body = await filterObjectForRulePaths(ctx.state.user!, ctx.state.project.id, visibilities)
})

router.delete('/:userId', projectRoleMiddleware('editor'), async ctx => {
    await UserDeleteJob.from({
        project_id: ctx.state.project.id,
        external_id: ctx.state.user!.external_id,
    }).queue()

    ctx.status = 204
    ctx.body = ''
})

router.get('/:userId/events', async ctx => {
    const searchSchema = SearchSchema('userEventSearchSchema', {
        sort: 'id',
        direction: 'desc',
    })
    const params = extractQueryParams(ctx.query, searchSchema)
    ctx.body = await getUserEvents(ctx.state.user!.id, params, ctx.state.project.id)
})

router.get('/:userId/subscriptions', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await getUserSubscriptions(ctx.state.user!, params, false)
})

router.patch('/:userId/subscriptions', async ctx => {
    const subscriptions = ctx.request.body as Array<{ subscription_id: number, state: SubscriptionState }>
    for (const subscription of subscriptions) {
        await toggleSubscription(
            ctx.state.user!.id,
            subscription.subscription_id,
            subscription.state,
        )
    }
    ctx.body = await getUser(ctx.state.user!.id)
})

router.get('/:userId/journeys', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedEntrancesByUser(ctx.state.user!.id, params)
})

export default router
