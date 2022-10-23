import { User } from '../users/User'
import { getJourneyEntrance, getJourneyStep, getUserJourneyIds, lastJourneyStep } from './JourneyRepository'
import { JourneyEntrance, JourneyDelay, JourneyGate, JourneyStep, JourneyMap, JourneyAction } from './JourneyStep'
import { UserEvent } from '../users/UserEvent'
import List from '../lists/List'

/**
 * Update all journeys that the user is currently in. Admittence to a
 * journey comes from a list, so we don't have to worry about journeys
 * the user has not started.
 *
 * @param user The user to look up journeys for
 * @param event An event that will be passed in to update journeys
 */
export const updateUserJourneys = async (user: User, event?: UserEvent) => {
    const journeys = await getUserJourneyIds(user.id)
    for (const journeyId of journeys) {
        const service = new JourneyService(journeyId)
        await service.run(user, event)
    }
}

export const enterJourneyFromList = async (list: List, user: User, event?: UserEvent) => {
    const steps = await JourneyStep.all(
        qb => qb.leftJoin('journeys', 'journeys.id', 'journey_steps.journey_id')
            .where('journeys.project_id', list.project_id)
            .where('type', JourneyEntrance.type)
            .whereJsonPath('data', '$.list_id', '=', list.id),
    )
    for (const step of steps) {
        const service = new JourneyService(step.journey_id)
        await service.run(user, event)
    }
}

export default class JourneyService {

    journeyId: number
    constructor(journeyId: number) {
        this.journeyId = journeyId
    }

    async run(user: User, event?: UserEvent): Promise<void> {

        // Loop through all possible next steps until we get an empty next
        // which signifies that the journey is in a pending state

        let nextStep: JourneyStep | undefined | null = await this.nextStep(user)
        while (nextStep) {
            const parsedStep = this.parse(nextStep)

            // If completed, jump to next otherwise validate condition
            if (await parsedStep.hasCompleted(user)) {
                nextStep = await parsedStep.next(user)
            } else if (await parsedStep.condition(user, event)) {
                await parsedStep.complete(user)
                nextStep = await parsedStep.next(user)
            } else {
                nextStep = null
            }
        }
    }

    parse(step: JourneyStep): JourneyStep {
        const options = {
            [JourneyEntrance.type]: JourneyEntrance,
            [JourneyDelay.type]: JourneyDelay,
            [JourneyGate.type]: JourneyGate,
            [JourneyMap.type]: JourneyMap,
            [JourneyAction.type]: JourneyAction,
        }
        return options[step.type]?.fromJson(step)
    }

    async nextStep(user: User): Promise<JourneyStep | undefined> {

        // Get the ID of last step the user has started previously
        const lastUserStep = await lastJourneyStep(user.id, this.journeyId)

        // The user hasn't started journey yet, check the entrance
        if (!lastUserStep) {
            return await getJourneyEntrance(this.journeyId)
        }

        // Get the data for the journey step
        return await getJourneyStep(lastUserStep.step_id)
    }
}
