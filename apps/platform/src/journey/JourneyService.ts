import { User } from '../users/User'
import { getEntranceSubsequentSteps, getJourney, getJourneyStepMap, getJourneySteps, setJourneyStepMap } from './JourneyRepository'
import { JourneyEntrance, JourneyStep, JourneyStepMap } from './JourneyStep'
import JourneyUserStep from './JourneyUserStep'
import { UserEvent } from '../users/UserEvent'
import App from '../app'
import { Rule, RuleTree } from '../rules/Rule'
import { check } from '../rules/RuleEngine'
import JourneyProcessJob from './JourneyProcessJob'
import Journey, { JourneyEntranceTriggerParams } from './Journey'
import JourneyError from './JourneyError'
import { RequestError } from '../core/errors'
import EventPostJob from '../client/EventPostJob'
import { pick, uuid } from '../utilities'

export const enterJourneysFromEvent = async (event: UserEvent, user?: User) => {

    // Look up all entrances in live journeys
    const entrances = await JourneyEntrance.all(q => q
        .join('journeys', 'journey_steps.journey_id', '=', 'journeys.id')
        .where('journeys.project_id', event.project_id)

        // Exclude journeys that are not live or the root journey
        .where('journeys.status', 'live')
        .whereNull('journeys.parent_id')
        .whereNull('journeys.deleted_at')

        // Filter down the step type to be an entrance
        .where('journey_steps.type', JourneyEntrance.type)
        .whereJsonPath('journey_steps.data', '$.trigger', '=', 'event')
        .whereJsonPath('journey_steps.data', '$.event_name', '=', event.name),
    )

    if (!entrances.length) return

    if (!user) {
        user = await User.find(event.user_id)
    }

    const input = {
        user: user!.flatten(),
        events: [event!.flatten()],
    }

    const entranceIds: number[] = []
    for (const entrance of entrances) {

        // If a rule is specified, check it before pushing user into journey
        if (entrance.rule) {
            const rule: RuleTree = {
                ...entrance.rule as Rule,
                group: 'event',
                path: '$.name',
                value: event.name, // ensure that the expected event name is here
            }
            if (!check(input, rule)) {
                continue
            }
        }

        // Skip if user has any entrances (active or ended)
        // into this journey and multiple are not allowed
        if (!entrance.multiple) {
            const hasAny = await JourneyUserStep.exists(q => q
                .where('user_id', event.user_id)
                .where('step_id', entrance.id),
            )
            if (hasAny) continue
        } else if (!entrance.concurrent) {
            const hasActive = await JourneyUserStep.exists(q => q
                .where('step_id', entrance.id)
                .where('user_id', event.user_id)
                .whereNull('ended_at'),
            )
            if (hasActive) continue
        }

        // Create new entrance
        entranceIds.push(await JourneyUserStep.insert({
            journey_id: entrance.journey_id,
            step_id: entrance.id,
            user_id: event.user_id,
            type: 'completed',
            data: {
                event: event.flatten(),
            },
        }))
    }

    if (entranceIds.length) {
        await App.main.queue.enqueueBatch(entranceIds.map(entrance_id => JourneyProcessJob.from({ entrance_id })))
    }
}

export const loadUserStepDataMap = async (referenceId: number | string) => {
    let step = await JourneyUserStep.find(referenceId)
    if (!step) return {}
    if (step.entrance_id) step = await JourneyUserStep.find(step.entrance_id)
    const [steps, userSteps] = await Promise.all([
        getJourneySteps(step!.journey_id),
        getEntranceSubsequentSteps(step!.id),
    ])
    return JourneyUserStep.getDataMap(steps, [step!, ...userSteps])
}

export const triggerEntrance = async (journey: Journey, payload: JourneyEntranceTriggerParams) => {

    // Look up target entrance step
    const step = await JourneyStep.first(qb => qb
        .where('journey_id', journey.id)
        .where('id', payload.entrance_id))

    // Make sure target step is actually an entrance
    if (!step || step.type !== JourneyEntrance.type) {
        throw new RequestError(JourneyError.JourneyStepDoesNotExist)
    }

    // Extract top-level vs custom properties user fields
    const { external_id, email, phone, device_token, locale, timezone, ...data } = payload.user

    // Create the user synchronously if new
    const { user, event } = await EventPostJob.from({
        project_id: journey.project_id,
        event: {
            name: 'journey_trigger',
            external_id: payload.user.external_id,
            data: {
                ...payload.event,
                journey: {
                    id: journey.id,
                    name: journey.name,
                    entrance_id: payload.entrance_id,
                },
            },
            user: { external_id, email, phone, data, locale, timezone },
        },
    }).handle<{ user: User, event: UserEvent }>()

    // Create new entrance
    const entrance_id = await JourneyUserStep.insert({
        journey_id: journey.id,
        user_id: user.id,
        step_id: step.id,
        type: 'completed',
        data: {
            event: event?.flatten(),
        },
    })

    // Trigger async processing
    await JourneyProcessJob.from({ entrance_id }).queue()
}

export const duplicateJourney = async (journey: Journey, asChild = false) => {
    const params: Partial<Journey> = pick(journey, ['project_id', 'name', 'description'])
    const newJourney = await Journey.insertAndFetch({
        ...params,
        name: asChild ? params.name : `Copy of ${params.name}`,
        status: 'draft',
        parent_id: asChild ? journey.parent_id ?? journey.id : undefined,
    })

    // If there is a parent record, the child steps must match
    // UUIDs otherwise remap them for the separate duplicate journey
    const steps = await getJourneyStepMap(journey.id)
    if (asChild) {
        await setJourneyStepMap(newJourney, steps)
    } else {
        const newSteps: JourneyStepMap = {}
        const stepKeys = Object.keys(steps)
        const uuidMap = stepKeys.reduce((acc, curr) => {
            acc[curr] = uuid()
            return acc
        }, {} as Record<string, string>)
        for (const key of stepKeys) {
            const step = steps[key]
            newSteps[uuidMap[key]] = {
                ...step,
                children: step.children?.map(({ external_id, ...rest }) => ({ external_id: uuidMap[external_id], ...rest })),
            }
        }
        await setJourneyStepMap(newJourney, newSteps)
    }

    return await getJourney(newJourney.id, journey.project_id)
}
