import { RequestError } from '../core/errors'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { JourneyStep, JourneyEntrance, JourneyUserStep, JourneyStepParams } from './JourneyStep'

export const allJourneys = async (projectId: number): Promise<Journey[]> => {
    return await Journey.all(qb => qb.where('project_id', projectId))
}

export const createJourney = async (params: JourneyParams): Promise<Journey> => {
    return await Journey.insertAndFetch(params)

    // TODO: Should we create an entrance automatically here?
}

export const getJourney = async (id: number, projectId: number): Promise<Journey> => {
    const journey = await Journey.find(id, qb => qb.where('project_id', projectId))
    if (!journey) throw new RequestError('Journey not found', 404)

    journey.steps = await allJourneySteps(journey.id)

    return journey
}

export const updateJourney = async (id: number, params: UpdateJourneyParams): Promise<Journey> => {
    return await Journey.updateAndFetch(id, params)
}

export const deleteJourney = async (id: number): Promise<void> => {
    await Journey.updateAndFetch(id, { deleted_at: new Date() })
}

export const allJourneySteps = async (journeyId: number): Promise<JourneyStep[]> => {
    return await JourneyStep.all(qb => qb.where('journey_id', journeyId))
}

export const getJourneyStep = async (id?: number): Promise<JourneyStep | undefined> => {
    if (!id) return
    return await JourneyStep.first(db => db.where('id', id))
}

export const createJourneyStep = async (journeyId: number, params: JourneyStepParams): Promise<JourneyStep> => {
    return await JourneyStep.insertAndFetch({ ...params, journey_id: journeyId })
}

export const updateJourneyStep = async (id: number, params: JourneyStepParams): Promise<JourneyStep> => {
    return await JourneyStep.updateAndFetch(id, { ...params })
}

export const deleteJourneyStep = async (id: number): Promise<number> => {
    return await JourneyStep.delete(qb => qb.where('id', id))
}

export const getUserJourneyStep = async (userId: number, stepId: number, type = 'completed'): Promise<JourneyUserStep | undefined> => {
    return await JourneyUserStep.first(
        db => db.where('step_id', stepId)
            .where('user_id', userId)
            .where('type', type)
            .orderBy('created_at', 'desc'),
    )
}

export const getJourneyEntrance = async (journeyId: number):Promise<JourneyStep | undefined> => {
    return await JourneyStep.first(
        db => db.where('type', JourneyEntrance.type)
            .where('journey_id', journeyId),
    )
}

export const lastJourneyStep = async (userId: number, journeyId: number): Promise<JourneyUserStep | undefined> => {
    return await JourneyUserStep.first(
        db => db.where('journey_id', journeyId)
            .where('user_id', userId)
            .orderBy('created_at', 'desc')
            .orderBy('id', 'desc'),
    )
}
