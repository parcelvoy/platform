import Router from '@koa/router'
import App from '../app'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { SegmentPostEventsRequest } from './Client'
import { ProjectState } from '../auth/AuthMiddleware'
import { projectMiddleware } from '../projects/ProjectController'
import UserPatchJob from '../users/UserPatchJob'
import { Job } from '../queue'
import { parseLocale } from '../utilities'
import UserAliasJob from '../users/UserAliasJob'

const router = new Router<ProjectState>()
router.use(projectMiddleware)

const segmentEventsRequest: JSONSchemaType<SegmentPostEventsRequest> = {
    $id: 'segmentPostEvents',
    type: 'array',
    items: {
        type: 'object',
        required: ['type'],
        properties: {
            type: { type: 'string' },
            event: {
                type: 'string',
                nullable: true,
            },
            anonymousId: {
                type: 'string',
                nullable: true,
            },
            userId: {
                type: 'string',
                nullable: true,
            },
            previousId: {
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
                required: ['userId'],
            },
        ],
    },
    minItems: 1,
    maxItems: 1000,
} as any
router.post('/segment', async ctx => {
    const events = validate(segmentEventsRequest, ctx.request.body)

    let chunks: Job[] = []

    for (const event of events) {
        const identity = {
            anonymous_id: event.anonymousId,
            external_id: event.userId,
        }
        if (event.type === 'alias') {

            chunks.push(UserAliasJob.from({
                project_id: ctx.state.project.id,
                previous_id: event.previousId,
                ...identity,
            }))
        } else if (event.type === 'identify') {

            chunks.push(UserPatchJob.from({
                project_id: ctx.state.project.id,
                user: {
                    ...identity,
                    email: event.traits?.email,
                    phone: event.traits?.phone,
                    timezone: event.context.timezone,
                    locale: event.context.locale && parseLocale(event.context.locale),
                    data: event.traits,
                },
            }))
        } else if (event.type === 'track') {

            chunks.push(EventPostJob.from({
                project_id: ctx.state.project.id,
                event: {
                    ...identity,
                    name: event.event,
                    data: { ...event.properties, ...event.context },
                    created_at: new Date(event.timestamp),
                },
            }))
        }

        // Based on queue max batch size, process in largest chunks
        // possible
        if (chunks.length > App.main.queue.batchSize) {
            await App.main.queue.enqueueBatch(chunks)
            chunks = []
        }
    }

    // Insert any remaining items
    if (chunks.length > 0) {
        await App.main.queue.enqueueBatch(chunks)
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
