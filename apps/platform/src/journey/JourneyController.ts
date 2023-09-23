import Router from '@koa/router'
import { projectRoleMiddleware } from '../projects/ProjectService'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import Journey, { JourneyParams } from './Journey'
import { createJourney, deleteJourney, getJourneyStepMap, getJourney, pagedJourneys, setJourneyStepMap, updateJourney, pagedEntrancesByJourney, getEntranceLog } from './JourneyRepository'
import { JourneyStepMapParams, JourneyUserStep, journeyStepTypes, toJourneyStepMap } from './JourneyStep'
import { User } from '../users/User'

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

router.param('journeyId', async (value, ctx, next) => {
    ctx.state.journey = await getJourney(parseInt(value), ctx.state.project.id)
    if (!ctx.state.journey) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:journeyId', async ctx => {
    ctx.body = ctx.state.journey
})

router.patch('/:journeyId', async ctx => {
    ctx.body = await updateJourney(ctx.state.journey!.id, validate(journeyParams, ctx.request.body))
})

router.delete('/:journeyId', async ctx => {
    await deleteJourney(ctx.state.journey!.id)
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

export default router
