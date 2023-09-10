import { User } from '../users/User'
import { getEntranceSubsequentSteps, getJourneyStepChildren, getJourneySteps } from './JourneyRepository'
import { JourneyEntrance, JourneyGate, JourneyStep, JourneyStepChild, JourneyUserStep, journeyStepTypes } from './JourneyStep'
import { UserEvent } from '../users/UserEvent'
import List, { UserList } from '../lists/List'
import { chunk, groupBy, uuid } from '../utilities'
import App from '../app'
import { Job } from '../queue'
import { getProject } from '../projects/ProjectService'
import { getUserEventsForRules } from '../users/UserRepository'
import Rule from '../rules/Rule'

const getActiveEntrancesForList = async (list: List) => {
    return await JourneyStep.all(q => q
        .leftJoin('journeys', 'journeys.id', 'journey_steps.journey_id')
        .where('journeys.project_id', list.project_id)
        .where('journeys.published', true)
        .where('type', JourneyEntrance.type)
        .whereJsonPath('data', '$.list_id', '=', list.id),
    )
}

export const loadUserStepDataMap = async (userStepId: number) => {
    let step = await JourneyUserStep.find(userStepId)
    if (!step) return
    if (step.entrance_id) step = await JourneyUserStep.find(step.entrance_id)
    const [steps, userSteps] = await Promise.all([
        getJourneySteps(step!.journey_id),
        getEntranceSubsequentSteps(step!.id),
    ])
    return JourneyUserStep.getDataMap(steps, [step!, ...userSteps])
}

/**
 * enter a single user into all unstarted journeys that reference a given list.
 * NOTE: this does not actually enqueue list processing.
 * Call resumeUserJourneys to do that.
 * @param list find all entrances that reference this list
 * @param user user to add to journeys
 * @param event (optional) event to link to entrance(s)
 */
export const enterJourneysFromList = async (list: List, user: User, event?: UserEvent) => {

    let entrances = await getActiveEntrancesForList(list)

    if (!entrances.length) return []

    // only include first with this list per journey
    entrances = entrances.filter((e, i, a) => a.findIndex(x => x.journey_id === e.journey_id) === i)

    const userSteps = await JourneyUserStep.all(q => q
        .where('user_id', user.id)
        .whereIn('step_id', entrances.map(s => s.id))
        .whereNull('entrance_id'),
    )

    const userStepIds: number[] = []
    for (const entrance of entrances) {
        if (userSteps.find(us => us.step_id === entrance.id)) {
            continue
        }
        userStepIds.push(await JourneyUserStep.insert({
            journey_id: entrance.journey_id,
            step_id: entrance.id,
            user_id: user.id,
            type: 'completed',
            data: {
                event: event
                    ? {
                        name: event.name,
                        data: event.data,
                    }
                    : undefined,
            },
        }))
    }
    return userStepIds
}

export const enterAllUnstartedJourneysFromList = async (list: List) => {

    // find all entrances that use this list
    const entrances = await getActiveEntrancesForList(list)

    if (!entrances.length) return

    const ref = uuid()

    const byJourneyId = groupBy(entrances, js => js.journey_id)

    for (const [journey_id, [entrance]] of byJourneyId) {

        // all users who have never started this journey
        const query = UserList.query()
            .select('user_lists.user_id as \'user_id\'')
            .leftJoin('journey_user_step', 'user_lists.user_id', '=', 'journey_user_step.user_id')
            .where('user_lists.list_id', list.id)
            .where(qb => qb.whereNull('journey_user_step.user_id').orWhere('journey_user_step.journey_id', journey_id))
            .groupBy('user_lists.user_id')
            .having(UserList.raw('count(journey_user_step.id) = 0'))

        await chunk<{ user_id: number }>(query, 100, async items => {
            if (!items.length) return
            await JourneyUserStep.insert(items.map(({ user_id }) => ({
                journey_id,
                user_id,
                step_id: entrance.id,
                type: 'completed',
                ref,
            })))
        })
    }

    return ref
}

type JobOrJobFunc = Job | ((state: JourneyState) => Job)

export class JourneyState {

    /**
     * resumes journey sequence/cycle processing for a given entrance (user can have multiple entrances, be in the journey multiple times)
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

        // entrance has already ended
        if (entrance.ended_at) {
            return
        }

        // find user
        if (!user) {
            user = await User.find(entrance.user_id)
        }
        if (!user) {
            return
        }

        // user-entrance mismatch
        if (entrance.user_id !== user.id) {
            return
        }

        // load all journey dependencies
        const [steps, children, userSteps] = await Promise.all([
            getJourneySteps(entrance.journey_id)
                .then(steps => steps.map(s => journeyStepTypes[s.type]?.fromJson(s))),
            getJourneyStepChildren(entrance.journey_id),
            getEntranceSubsequentSteps(entrance.id),
        ])

        const state = new this(entrance, steps, children, [entrance, ...userSteps], user)

        await state.run()

        return state
    }

    // load step dependencies once and cache in state
    private _events?: UserEvent[]
    private _timezone?: string

    // batch enqueue jobs after processing
    private _jobs: JobOrJobFunc[] = []

    private constructor(
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

            } else {

                // continue on if this step is completed
                if (userStep.type === 'completed') {
                    step = await this.nextOrEnd(step)
                    continue
                }

                // exit journey completely if a catastrophic error
                // has occurred to avoid unpredictable behavior
                if (userStep.type === 'error') {
                    await this.end()
                }

                // stop processing for now
                break
            }

            // delegate to step type
            await step.process(this, userStep)

            // persist and update the user step
            userStep.parseJson(
                userStep.id
                    ? await JourneyUserStep.updateAndFetch(userStep.id, userStep)
                    : await JourneyUserStep.insertAndFetch(userStep),
            )
        }

        if (this._jobs.length) {
            await App.main.queue.enqueueBatch(this._jobs.map(j => typeof j === 'function' ? j(this) : j))
        }
    }

    private async nextOrEnd(step: JourneyStep) {
        const stepId = await step.next(this)
        if (stepId) {
            const step = this.steps.find(s => s.id === stepId)
            if (step) {
                return step
            }
        }
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
