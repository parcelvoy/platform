import Router, { ParamMiddleware } from '@koa/router'
import { projectRoleMiddleware } from '../projects/ProjectService'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import Journey, { JourneyEntranceTriggerParams, JourneyParams } from './Journey'
import { createJourney, getJourneyStepMap, getJourney, pagedJourneys, setJourneyStepMap, updateJourney, pagedEntrancesByJourney, getEntranceLog, pagedUsersByStep, archiveJourney, deleteJourney, exitUserFromJourney } from './JourneyRepository'
import { JourneyStep, JourneyStepMapParams, JourneyUserStep, journeyStepTypes, toJourneyStepMap } from './JourneyStep'
import { User } from '../users/User'
import { RequestError } from '../core/errors'
import JourneyError from './JourneyError'
import { getUserFromContext } from '../users/UserRepository'
import { duplicateJourney, triggerEntrance } from './JourneyService'

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
                        path: {
                            type: 'string',
                            nullable: true,
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
    const { steps, children } = await setJourneyStepMap(ctx.state.journey!, validate(journeyStepsParamsSchema, ctx.request.body))
    ctx.body = await toJourneyStepMap(steps, children)
})

router.post('/:journeyId/duplicate', async ctx => {
    ctx.body = await duplicateJourney(ctx.state.journey!)
})

router.get('/:journeyId/entrances', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedEntrancesByJourney(ctx.state.journey!.id, params)
})

router.delete('/:journeyId/entrances/:entranceId/users/:userId', async ctx => {
    const user = await getUserFromContext(ctx)
    if (!user) return ctx.throw(404)
    const results = await exitUserFromJourney(user.id, parseInt(ctx.params.entranceId), ctx.state.journey!.id)
    ctx.body = { exits: results }
})

router.get('/:journeyId/steps/:stepId/users', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    const step = await JourneyStep.first(q => q
        .where('journey_id', ctx.state.journey!.id)
        .where('id', parseInt(ctx.params.stepId)),
    )
    if (!step) return ctx.throw(404)
    ctx.body = await pagedUsersByStep(step.id, params)
})

router.delete('/:journeyId/users/:userId', async ctx => {
    const user = await getUserFromContext(ctx)
    if (!user) return ctx.throw(404)
    const results = await JourneyUserStep.update(
        q => q.where('user_id', user.id)
            .whereNull('entrance_id')
            .whereNull('ended_at')
            .where('journey_id', ctx.state.journey!.id),
        { ended_at: new Date() },
    )
    ctx.body = { exits: results }
})

const journeyTriggerParams: JSONSchemaType<JourneyEntranceTriggerParams> = {
    $id: 'journeyEntranceTriggerParams',
    type: 'object',
    required: ['entrance_id', 'user'],
    properties: {
        entrance_id: {
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

// Manually trigger a journey entrance
router.post('/:journeyId/trigger', async ctx => {
    const journey = ctx.state.journey!
    const payload = validate(journeyTriggerParams, ctx.request.body)

    await triggerEntrance(journey, payload)
    ctx.body = { success: true }
})

export default router
