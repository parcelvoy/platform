import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { allJourneys, createJourney, createJourneyStep, deleteJourney, deleteJourneyStep, getJourney, updateJourney, updateJourneyStep } from './JourneyRepository'
import { JourneyStepParams } from './JourneyStep'

const router = new Router<{
    app: App
    journey?: Journey
    user: { project_id: number }
}>({
    prefix: '/journeys',
})

router.get('/', async ctx => {
    ctx.body = await allJourneys(ctx.state.user.project_id)
})

const journeyParams: JSONSchemaType<JourneyParams> = {
    $id: 'journeyParams',
    type: 'object',
    required: ['project_id', 'name'],
    properties: {
        project_id: {
            type: 'integer',
        },
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
    ctx.body = await createJourney(payload)
})

router.param('journeyId', async (value, ctx, next) => {
    ctx.state.journey = await getJourney(parseInt(ctx.params.journeyId), ctx.state.user.project_id)
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
