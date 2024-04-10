import App from '../app'
import { acquireLock, releaseLock } from '../core/Lock'
import { getProject } from '../projects/ProjectService'
import Job from '../queue/Job'
import Rule from '../rules/Rule'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { getUserEventsForRules } from '../users/UserRepository'
import { shallowEqual } from '../utilities'
import { getEntranceSubsequentSteps, getJourneyStepChildren, getJourneySteps } from './JourneyRepository'
import { JourneyGate, JourneyStep, JourneyStepChild, JourneyUserStep, journeyStepTypes } from './JourneyStep'

type JobOrJobFunc = Job | ((state: JourneyState) => Promise<Job | undefined>)

export class JourneyState {

    /**
     * Resumes journey sequence/cycle processing for a given entrance (user can have multiple entrances, be in the journey multiple times)
     * @param entrance entrance user step
     * @param user target user to run journey for
     * @returns promise that resolves when processing ends
     */
    public static async resume(entrance: number | JourneyUserStep, user?: User) {

        // find entrance
        if (typeof entrance === 'number') {
            entrance = (await JourneyUserStep.find(entrance))!
        }
        if (!entrance) {
            return
        }
        if (entrance.entrance_id) {
            entrance = (await JourneyUserStep.find(entrance.entrance_id))!
            if (!entrance || entrance.entrance_id) {
                return
            }
        }

        // Entrance has already ended
        if (entrance.ended_at) {
            return
        }

        // Find user
        if (!user) {
            user = await User.find(entrance.user_id)
        }
        if (!user) {
            return
        }

        // User-entrance mismatch
        if (entrance.user_id !== user.id) {
            return
        }

        const key = `journey:entrance:${entrance.id}`

        const acquired = await acquireLock({ key })
        if (!acquired) {
            return
        }

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
    private _events?: UserEvent[]
    private _timezone?: string

    // Batch enqueue jobs after processing
    private _jobs: JobOrJobFunc[] = []

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

                // create a placeholder for new step
                this.userSteps.push(userStep = JourneyUserStep.fromJson({
                    journey_id: this.entrance.journey_id,
                    entrance_id: this.entrance.id,
                    user_id: this.user.id,
                    step_id: step.id,
                    type: 'pending',
                }))
            }

            // continue on if this step is completed
            if (userStep.type === 'completed') {
                step = await this.nextOrEnd(step)
                continue
            }

            const copy = { ...userStep }

            // delegate to step type
            try {
                await step.process(this, userStep)
            } catch (err) {
                userStep.type = 'error'
            }

            // persist and update the user step
            if (userStep.id) {
                // only update the step is something has changed
                if (!shallowEqual(copy, userStep)) {
                    userStep.parseJson(await JourneyUserStep.updateAndFetch(userStep.id, userStep))
                }
            } else {
                userStep.parseJson(await JourneyUserStep.insertAndFetch(userStep))
            }

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

        if (this._jobs.length) {
            const jobs: Job[] = []
            for (let j of this._jobs) {
                if (typeof j === 'function') {
                    const i = await j(this)
                    if (!i) continue
                    j = i
                }
                jobs.push(j)
            }
            await App.main.queue.enqueueBatch(jobs)
        }
    }

    private async nextOrEnd(step: JourneyStep) {
        try {
            const stepId = await step.next(this)
            if (stepId) {
                const step = this.steps.find(s => s.id === stepId)
                if (step) {
                    if (this.userSteps.find(s => s.step_id === step.id)) {
                        // circular reference, this step has already visited
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

    public job(job: JobOrJobFunc) {
        this._jobs.push(job)
    }

    public async events() {
        // lazy load, only grab the specific event types that we need for gates in this journey.
        if (!this._events) {
            this._events = await getUserEventsForRules(
                [this.user.id],
                this.steps.reduce<Rule[]>((a, c) => {
                    if (c instanceof JourneyGate) {
                        a.push(c.rule)
                    }
                    return a
                }, []),
            )
        }
        return this._events
    }

    public async timezone() {
        if (!this._timezone) {
            this._timezone = this.user.timezone
        }
        if (!this._timezone) {
            this._timezone = (await getProject(this.user.project_id))!.timezone
        }
        return this._timezone!
    }

    public stepData() {
        return JourneyUserStep.getDataMap(this.steps, this.userSteps)
    }
}
