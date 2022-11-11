import Router from '@koa/router'
import { ProjectState } from '../config/controllers'
import { searchParamsSchema } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { createJourney, createJourneyStep, deleteJourney, deleteJourneyStep, getJourney, pagedJourneys, updateJourney, updateJourneyStep } from './JourneyRepository'
import { JourneyStepParams } from './JourneyStep'

const router = new Router<
    ProjectState & { journey?: Journey }
>({
    prefix: '/journeys',
})

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
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(journeyParams, ctx.request.body)
    ctx.body = await createJourney(ctx.state.project.id, payload)
})

router.param('journeyId', async (value, ctx, next) => {
    ctx.state.journey = await getJourney(parseInt(value), ctx.state.project.id)
    if (!ctx.state.list) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:journeyId', async ctx => {
    ctx.body = ctx.state.journey
})

const updateJourneyParams: JSONSchemaType<UpdateJourneyParams> = {
    $id: 'updateJourneyParams',
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
    },
    additionalProperties: false,
}

router.patch('/:journeyId', async ctx => {
    const payload = validate(updateJourneyParams, ctx.request.body)
    ctx.body = await updateJourney(ctx.state.journey!.id, payload)
})

router.delete('/:journeyId', async ctx => {
    await deleteJourney(ctx.state.journey!.id)
    ctx.body = true
})

const journeyStepParams: JSONSchemaType<JourneyStepParams> = {
    $id: 'journeyStepParams',
    type: 'object',
    required: ['type'],
    properties: {
        type: {
            type: 'string',
            enum: ['entrance', 'delay', 'action', 'gate', 'map'],
        },
        child_id: {
            type: 'integer',
            nullable: true,
        },
        data: {
            type: 'object', // TODO: Could validate further based on sub types
            nullable: true,
            additionalProperties: true,
        },
        x: {
            type: 'integer',
        },
        y: {
            type: 'integer',
        },
    },
    additionalProperties: false,
}

router.post('/:journeyId/steps', async ctx => {
    const payload = validate(journeyStepParams, ctx.request.body)
    ctx.body = await createJourneyStep(ctx.state.journey!.id, payload)
})

router.patch('/:journeyId/steps/:stepId', async ctx => {
    const payload = validate(journeyStepParams, ctx.request.body)
    ctx.body = await updateJourneyStep(parseInt(ctx.params.id), payload)
})

router.delete('/:journeyId/steps/:stepId', async ctx => {
    await deleteJourneyStep(parseInt(ctx.params.stepId))
    ctx.body = true
})

export default router
