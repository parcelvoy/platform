import { JourneyStep, JourneyEntrance, JourneyUserStep } from './JourneyStep'

export const getJourneyStep = async (id?: number): Promise<JourneyStep | undefined> => {
    if (!id) return
    return await JourneyStep.first(db => db.where('id', id))
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
        db => db.where('type', JourneyEntrance.name)
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
