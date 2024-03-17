import Router, { ParamMiddleware } from '@koa/router'
import { projectRoleMiddleware } from '../projects/ProjectService'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import Journey, { JourneyParams } from './Journey'
import { createJourney, getJourneyStepMap, getJourney, pagedJourneys, setJourneyStepMap, updateJourney, pagedEntrancesByJourney, getEntranceLog, pagedUsersByStep, archiveJourney, deleteJourney } from './JourneyRepository'
import { JourneyEntrance, JourneyStep, JourneyStepMapParams, JourneyUserStep, journeyStepTypes, toJourneyStepMap } from './JourneyStep'
import { User } from '../users/User'
import { RequestError } from '../core/errors'
import JourneyError from './JourneyError'
import { EventPostJob } from '../jobs'
import { UserEvent } from '../users/UserEvent'
import JourneyProcessJob from './JourneyProcessJob'

const router = new Router<
    ProjectState & { journey?: Journey }
>({
    prefix: '/journeys',
})

router.use(projectRoleMiddleware('editor'))

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedJourneys(params, ctx.state.project.id)
})

const journeyParams: JSONSchemaType<JourneyParams> = {
    $id: 'journeyParams',
    type: 'object',
    required: ['name'],
    properties: {
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
            nullable: true,
        },
        tags: {
            type: 'array',
            items: {
                type: 'string',
            },
            nullable: true,
        },
        published: {
            type: 'boolean',
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(journeyParams, ctx.request.body)
    ctx.body = await createJourney(ctx.state.project.id, payload)
})

router.get('/entrances/:entranceId', async ctx => {
    const entrance = await JourneyUserStep.first(q => q
        .join('journeys', 'journey_user_step.journey_id', '=', 'journeys.id')
        .where('journeys.project_id', ctx.state.project.id)
        .where('journey_user_step.id', parseInt(ctx.params.entranceId, 10))
        .whereNull('journey_user_step.entrance_id'),
    )
    if (!entrance) {
        return ctx.throw(404)
    }
    const [user, journey, userSteps] = await Promise.all([
        User.find(entrance.user_id),
        Journey.find(entrance.journey_id),
        getEntranceLog(entrance.id),
    ])
    ctx.body = { journey, user, userSteps }
})

const checkJourneyId: ParamMiddleware = async (value, ctx, next) => {
    ctx.state.journey = await getJourney(parseInt(value), ctx.state.project.id)
    if (!ctx.state.journey) {
        throw new RequestError(JourneyError.JourneyDoesNotExist)
    }
    return await next()
}

router.param('journeyId', checkJourneyId)

router.get('/:journeyId', async ctx => {
    ctx.body = ctx.state.journey
})

router.patch('/:journeyId', async ctx => {
    ctx.body = await updateJourney(ctx.state.journey!.id, validate(journeyParams, ctx.request.body))
})

router.delete('/:journeyId', async ctx => {
    const { id, project_id, deleted_at } = ctx.state.journey!
    if (deleted_at) {
        await deleteJourney(id, project_id)
    } else {
        await archiveJourney(id, project_id)
    }

    ctx.body = true
})

const journeyStepsParamsSchema: JSONSchemaType<JourneyStepMapParams> = {
    $id: 'journeyStepsParams',
    type: 'object',
    required: [],
    additionalProperties: {
        type: 'object',
        required: ['type', 'x', 'y'],
        properties: {
            type: {
                type: 'string',
                enum: Object.keys(journeyStepTypes),
            },
            name: {
                type: 'string',
                nullable: true,
            },
            data: {
                type: 'object', // TODO: Could validate further based on sub types
                nullable: true,
                additionalProperties: true,
            },
            data_key: {
                type: 'string',
                nullable: true,
            },
            x: {
                type: 'number',
            },
            y: {
                type: 'number',
            },
            children: {
                type: 'array',
                nullable: true,
                items: {
                    type: 'object',
                    required: ['external_id'],
                    properties: {
                        external_id: {
                            type: 'string',
                        },
                        data: {
                            type: 'object', // TODO: this is also specific to the parent node's type
                            nullable: true,
                            additionalProperties: true,
                        },
                    },
                },
            },
        },
        additionalProperties: false,
    },
}

router.get('/:journeyId/steps', async ctx => {
    ctx.body = await getJourneyStepMap(ctx.state.journey!.id)
})

router.put('/:journeyId/steps', async ctx => {
    const { steps, children } = await setJourneyStepMap(ctx.state.journey!.id, validate(journeyStepsParamsSchema, ctx.request.body))
    ctx.body = await toJourneyStepMap(steps, children)
})

router.get('/:journeyId/entrances', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedEntrancesByJourney(ctx.state.journey!.id, params)
})

router.get('/:journeyId/steps/:stepId/users', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    const step = await JourneyStep.first(q => q
        .where('journey_id', ctx.state.journey!.id)
        .where('id', parseInt(ctx.params.stepId)),
    )
    if (!step) {
        ctx.throw(404)
        return
    }
    ctx.body = await pagedUsersByStep(step.id, params)
})

interface JourneyEntranceTriggerParams {
    entranceId: number
    user: Pick<User, 'email' | 'phone' | 'timezone' | 'locale'> & { external_id: string, device_token?: string }
    event?: Record<string, unknown>
}

const journeyTriggerParams: JSONSchemaType<JourneyEntranceTriggerParams> = {
    $id: 'journeyEntranceTriggerParams',
    type: 'object',
    required: ['entranceId', 'user'],
    properties: {
        entranceId: {
            type: 'number',
            minimum: 1,
        },
        user: {
            type: 'object',
            required: ['external_id'],
            properties: {
                external_id: { type: 'string' },
                email: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
                device_token: { type: 'string', nullable: true },
                timezone: { type: 'string', nullable: true },
                locale: { type: 'string', nullable: true },
            },
            additionalProperties: true,
        },
        event: {
            type: 'object',
            additionalProperties: true,
            nullable: true,
        },
    },
    additionalProperties: false,
}

// manually trigger a journey entrance
router.post('/:journeyId/trigger', async ctx => {
    const journey = ctx.state.journey!
    const payload = validate(journeyTriggerParams, ctx.request.body)

    // look up target entrance step
    const step = await JourneyStep.first(qb => qb
        .where('journey_id', journey.id)
        .where('id', payload.entranceId))

    // make sure target step is actually an entrance
    if (!step || step.type !== JourneyEntrance.type) {
        throw new RequestError(JourneyError.JourneyStepDoesNotExist)
    }

    // extract top-level vs custom properties user fields
    const { external_id, email, phone, device_token, locale, timezone, ...data } = payload.user

    // create the user synchronously if new
    const { user, event } = await EventPostJob.from({
        project_id: journey.project_id,
        event: {
            name: 'trigger',
            external_id: payload.user.external_id,
            data: payload.event,
            user: { external_id, email, phone, data, locale, timezone },
        },
    }).handle<{ user: User, event: UserEvent }>()

    // create new entrance
    const entrance_id = await JourneyUserStep.insert({
        journey_id: journey.id,
        user_id: user.id,
        step_id: step.id,
        type: 'completed',
        data: {
            event: event?.flatten(),
        },
    })

    // trigger async processing
    await JourneyProcessJob.from({ entrance_id }).queue()

    ctx.body = { success: true }
})

export default router
