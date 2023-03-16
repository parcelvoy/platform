import Router from '@koa/router'
import App from '../app'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { SegmentPostEventsRequest } from './Client'
import { aliasUser } from '../users/UserRepository'
import { ProjectState } from '../auth/AuthMiddleware'
import { projectMiddleware } from '../projects/ProjectController'
import UserPatchJob from '../users/UserPatchJob'

const router = new Router<ProjectState>()
router.use(projectMiddleware)

const segmentEventsRequest: JSONSchemaType<SegmentPostEventsRequest> = {
    $id: 'segmentPostEvents',
    type: 'array',
    items: {
        type: 'object',
        required: ['event', 'type'],
        properties: {
            event: { type: 'string' },
            type: { type: 'string' },
            anonymousId: {
                type: 'string',
                nullable: true,
            },
            externalId: {
                type: 'string',
                nullable: true,
            },
            properties: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
            },
            traits: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
            },
            context: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
            },
            timestamp: { type: 'string' },
        },
        anyOf: [
            {
                required: ['anonymousId'],
            },
            {
                required: ['externalId'],
            },
        ],
    },
    minItems: 1,
    maxItems: 200,
} as any
router.post('/segment', async ctx => {
    const events = validate(segmentEventsRequest, ctx.request.body)

    for (const event of events) {
        const identity = {
            anonymous_id: event.anonymousId,
            external_id: event.userId,
        }
        if (event.type === 'alias') {
            await aliasUser(ctx.state.project.id, identity)
        } else if (event.type === 'identify') {

            await App.main.queue.enqueue(UserPatchJob.from({
                project_id: ctx.state.project.id,
                user: {
                    ...identity,
                    email: event.traits.email,
                    phone: event.traits.phone,
                    data: event.traits,
                },
            }))
        } else if (event.type === 'track') {

            await App.main.queue.enqueue(EventPostJob.from({
                project_id: ctx.state.project.id,
                event: {
                    ...identity,
                    name: event.event,
                    data: { ...event.properties, ...event.context },
                },
            }))
        }
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
