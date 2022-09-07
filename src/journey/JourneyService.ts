import { User } from '../users/User'
import Journey from './Journey'
import { getJourneyEntrance, getJourneyStep, lastJourneyStep } from './JourneyRepository'
import { JourneyEntrance, JourneyDelay, JourneyGate, JourneyStep, JourneyMap, JourneyAction } from './JourneyStep'
import { UserEvent } from '../users/UserEvent'
import List from '../lists/List'

// TODO: Hate this, should journeys required lists for entrance?
// TODO: Should there even be a service?
export const updateJourneys = async (user: User, event?: UserEvent) => {
    const journeys = await Journey.all(qb => qb.where('project_id', user.project_id))
    for (const journey of journeys) {
        const service = new JourneyService(journey.id)
        await service.run(user, event)
    }
}

export const enterJourneyFromList = async (list: List, user: User, event?: UserEvent) => {
    const steps = await JourneyStep.all(
        qb => qb.where('project_id', list.project_id)
            .where('type', JourneyEntrance.name)
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
            [JourneyEntrance.name]: JourneyEntrance,
            [JourneyDelay.name]: JourneyDelay,
            [JourneyGate.name]: JourneyGate,
            [JourneyMap.name]: JourneyMap,
            [JourneyAction.name]: JourneyAction,
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
