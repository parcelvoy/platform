import { acquireLock, releaseLock } from '../core/Lock'
import { getProject } from '../projects/ProjectService'
import { Rule } from '../rules/Rule'
import { User } from '../users/User'
import { getUserEventsForRules } from '../users/UserRepository'
import { shallowEqual } from '../utilities'
import { getEntranceSubsequentSteps, getJourneyStepChildren, getJourneySteps } from './JourneyRepository'
import { JourneyStep, JourneyStepChild, journeyStepTypes } from './JourneyStep'
import JourneyUserStep from './JourneyUserStep'

export class JourneyState {

    /**
     * Resumes journey sequence/cycle processing for a given entrance (user can have multiple entrances, be in the journey multiple times)
     * @param entrance entrance user step
     * @param user target user to run journey for
     * @returns promise that resolves when processing ends
     */
    public static async resume(entrance?: number | JourneyUserStep, user?: User) {

        // Find entrance
        entrance = entrance instanceof JourneyUserStep
            ? entrance
            : await JourneyUserStep.find(entrance)
        if (!entrance) return

        // If step isn't an entrance, find real entrance
        if (entrance.entrance_id) {
            entrance = await JourneyUserStep.find(entrance.entrance_id)
            if (!entrance || entrance.entrance_id) return
        }

        // Entrance has already ended
        if (entrance.ended_at) return

        // Find user
        if (!user) user = await User.find(entrance.user_id)
        if (!user) return

        // User-entrance mismatch
        if (entrance.user_id !== user.id) return

        // Acquire lock to prevent multiple simultaneous runs
        const key = `journey:entrance:${entrance.id}`
        const acquired = await acquireLock({ key })
        if (!acquired) return

        // Load all journey dependencies
        const [steps, children, userSteps] = await Promise.all([
            getJourneySteps(entrance.journey_id)
                .then(steps => steps.map(s => journeyStepTypes[s.type]?.fromJson(s))),
            getJourneyStepChildren(entrance.journey_id),
            getEntranceSubsequentSteps(entrance.id),
        ])

        const state = new this(entrance, steps, children, [entrance, ...userSteps], user)

        await state.run()

        await releaseLock(key)

        return state
    }

    // Load step dependencies once and cache in state
    #timezone?: string

    constructor(
        public readonly entrance: JourneyUserStep,
        public readonly steps: JourneyStep[],
        public readonly children: JourneyStepChild[],
        public readonly userSteps: JourneyUserStep[],
        public readonly user: User,
    ) {}

    private async run() {

        let userStep = this.userSteps[this.userSteps.length - 1]
        let step = this.steps.find(s => s.id === userStep.step_id)

        while (step) {

            if (userStep.step_id !== step.id) {

                // Create a placeholder for new step
                this.userSteps.push(userStep = JourneyUserStep.fromJson({
                    journey_id: this.entrance.journey_id,
                    entrance_id: this.entrance.id,
                    user_id: this.user.id,
                    step_id: step.id,
                    type: 'pending',
                }))
            }

            // Continue on if this step is completed
            if (userStep.type === 'completed') {
                step = await this.nextOrEnd(step)
                continue
            }

            const copy = { ...userStep }

            // Delegate to step type
            let processData: Record<string, any> | undefined
            try {
                const data = await step.process(this, userStep)
                if (data) processData = data
            } catch (err) {
                userStep.type = 'error'
            }

            // Persist and update the user step
            if (userStep.id) {
                // only update the step is something has changed
                if (!shallowEqual(copy, userStep)) {
                    userStep.parseJson(await JourneyUserStep.updateAndFetch(userStep.id, userStep))
                }
            } else {
                userStep.parseJson(await JourneyUserStep.insertAndFetch(userStep))
            }

            // Process post actions
            await step.postProcess(this, userStep, processData)

            // Stop processing if latest isn't completed
            if (userStep.type !== 'completed') {
                // Exit journey completely if a catastrophic error
                // has occurred to avoid unpredictable behavior
                if (userStep.type === 'error') {
                    await this.end()
                }
                break
            }
        }
    }

    private async nextOrEnd(step: JourneyStep) {
        try {
            const stepId = await step.next(this)
            if (stepId) {
                const step = this.steps.find(s => s.id === stepId)
                if (step) {
                    if (this.userSteps.find(s => s.step_id === step.id)) {
                        // Circular reference, this step has already visited
                        await this.end()
                        return
                    }
                    return step
                }
            }
        } catch {}
        await this.end()
    }

    private async end() {
        await JourneyUserStep.update(q => q.where('id', this.entrance.id), {
            ended_at: new Date(),
        })
    }

    public childrenOf(stepId: number) {
        return this.children.filter(sc => sc.step_id === stepId)
    }

    public async events(rule: Rule) {
        // TODO: Find a way to not have to pull in all events, better discern
        return await getUserEventsForRules(this.user.id, rule)
    }

    public async timezone() {
        if (!this.#timezone) {
            this.#timezone = this.user.timezone
        }
        if (!this.#timezone) {
            this.#timezone = (await getProject(this.user.project_id))!.timezone
        }
        return this.#timezone!
    }

    public stepData() {
        return JourneyUserStep.getDataMap(this.steps, this.userSteps)
    }
}
