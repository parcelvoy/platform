import App from '../app'
import { Database } from '../config/database'
import { RequestError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { JourneyStep, JourneyEntrance, JourneyUserStep, JourneyStepMap, toJourneyStepMap, JourneyStepChild } from './JourneyStep'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { User } from '../users/User'
import { getProject } from '../projects/ProjectService'

export const pagedJourneys = async (params: PageParams, projectId: number) => {
    const result = await Journey.search(
        { ...params, fields: ['name'] },
        qb => {
            qb.where({ project_id: projectId }).whereNull('deleted_at')
            if (params.tag?.length) qb.whereIn('id', createTagSubquery(Journey, projectId, params.tag))
            return qb
        },
    )
    if (result.results?.length) {
        const tags = await getTags(Journey.tableName, result.results.map(j => j.id))
        for (const journey of result.results) {
            journey.tags = tags.get(journey.id) ?? []
        }
    }
    return result
}

export const allJourneys = async (projectId: number): Promise<Journey[]> => {
    return await Journey.all(qb => qb.where('project_id', projectId))
}

export const createJourney = async (projectId: number, { tags, ...params }: JourneyParams): Promise<Journey> => {
    return App.main.db.transaction(async trx => {

        const journey = await Journey.insertAndFetch({
            ...params,
            project_id: projectId,
        }, trx)

        // auto-create entrance step
        await JourneyEntrance.create(journey.id, undefined, trx)

        if (tags?.length) {
            await setTags({
                project_id: projectId,
                entity: Journey.tableName,
                entity_id: journey.id,
                names: tags,
            }, trx)
        }

        return journey
    })
}

export const getJourney = async (id: number, projectId: number): Promise<Journey> => {
    const journey = await Journey.find(id, qb => qb.where('project_id', projectId))
    if (!journey) throw new RequestError('Journey not found', 404)
    journey.tags = await getTags(Journey.tableName, [journey.id]).then(m => m.get(journey.id)) ?? []
    return journey
}

export const updateJourney = async (id: number, { tags, ...params }: UpdateJourneyParams, db = App.main.db): Promise<Journey> => {
    const journey = await db.transaction(async trx => {
        const journey = await Journey.updateAndFetch(id, params, trx)
        if (tags) {
            await setTags({
                project_id: journey.project_id,
                entity: Journey.tableName,
                entity_id: journey.id,
                names: tags,
            }, trx)
        }
        return journey
    })

    return await getJourney(id, journey.project_id)
}

export const deleteJourney = async (id: number, projectId: number): Promise<void> => {
    await Journey.deleteById(id, qb => qb.where('project_id', projectId))
}

export const archiveJourney = async (id: number, projectId: number): Promise<void> => {
    await Journey.archive(id, qb => qb.where('project_id', projectId), { published: false })
}

export const getJourneySteps = async (journeyId: number, db?: Database): Promise<JourneyStep[]> => {
    return await JourneyStep.all(qb => qb.where('journey_id', journeyId), db)
}

export const getJourneyStepChildren = async (journeyId: number, db?: Database): Promise<JourneyStepChild[]> => {
    return await JourneyStepChild.all(
        q => q
            .whereIn('step_id', JourneyStep.query(db).select('id').where('journey_id', journeyId))
            .orderBy('priority', 'asc')
            .orderBy('id', 'asc'),
        db,
    )
}

export const getJourneyStepMap = async (journeyId: number) => {
    const [steps, children] = await Promise.all([
        getJourneySteps(journeyId),
        getJourneyStepChildren(journeyId),
    ])
    return toJourneyStepMap(steps, children)
}

export const setJourneyStepMap = async (journey: Journey, stepMap: JourneyStepMap) => {
    return await App.main.db.transaction(async trx => {

        const [steps, children] = await Promise.all([
            getJourneySteps(journey.id, trx),
            getJourneyStepChildren(journey.id, trx),
        ])

        const now = new Date()
        const project = await getProject(journey.project_id)

        // Create or update steps
        for (const [external_id, { type, x = 0, y = 0, data = {}, data_key, name = '' }] of Object.entries(stepMap)) {
            let step = steps.find(s => s.external_id === external_id)
            if (!step) {
                steps.push(step = new JourneyStep())
            }
            let next_scheduled_at: null | Date = null
            if (type === JourneyEntrance.type && data.trigger === 'schedule') {
                if (step.data?.schedule !== data.schedule) {
                    next_scheduled_at = JourneyEntrance.fromJson({ data }).nextDate(project?.timezone ?? 'UTC', now)
                } else {
                    next_scheduled_at = step.next_scheduled_at
                }
            }
            const fields = { data, data_key, name, next_scheduled_at, x, y }
            step.parseJson(step.id
                ? await JourneyStep.updateAndFetch(step.id, fields, trx)
                : await JourneyStep.insertAndFetch({
                    ...fields,
                    external_id,
                    journey_id: journey.id,
                    type,
                }, trx),
            )
        }

        // Delete removed or unused steps
        const deleteSteps: number[] = []
        let i = 0
        while (i < steps.length) {
            const step = steps[i]
            if (!stepMap[step.external_id]) {
                deleteSteps.push(step.id)
                steps.splice(i, 1)
                continue
            }
            i++
        }
        if (deleteSteps.length) {
            await JourneyStep.delete(q => q.whereIn('id', deleteSteps), trx)
        }

        const deleteChildSteps: number[] = []
        for (const step of steps) {
            const list = stepMap[step.external_id]?.children ?? []
            const childIds: number[] = []

            let ci = 0
            for (const { external_id, path, data = {} } of list) {
                const child = steps.find(s => s.external_id === external_id)
                if (!child) continue
                const idx = children.findIndex(sc => sc.step_id === step.id && sc.child_id === child.id)
                let stepChild: JourneyStepChild
                if (idx === -1) {
                    children.push(stepChild = await JourneyStepChild.insertAndFetch({
                        step_id: step.id,
                        child_id: child.id,
                        data,
                        path,
                        priority: ci,
                    }, trx))
                } else {
                    stepChild = children[idx]
                    children[idx] = await JourneyStepChild.updateAndFetch(stepChild.id, {
                        data,
                        path,
                        priority: ci,
                    }, trx)
                }
                childIds.push(stepChild.child_id)
                ci++
            }

            i = 0
            while (i < children.length) {
                const stepChild = children[i]
                if (stepChild.step_id === step.id && !childIds.includes(stepChild.child_id)) {
                    deleteChildSteps.push(stepChild.id)
                    children.splice(i, 1)
                    continue
                }
                i++
            }
        }
        if (deleteChildSteps.length) {
            await JourneyStepChild.delete(q => q.whereIn('id', deleteChildSteps), trx)
        }

        return { steps, children }
    })
}

export const getEntranceSubsequentSteps = async (entranceId: number) => {
    return JourneyUserStep.all(q => q
        .where('entrance_id', entranceId)
        .orderBy('id', 'asc'),
    )
}

export const pagedEntrancesByJourney = async (journeyId: number, params: PageParams) => {
    const r = await JourneyUserStep.search(params, q => q
        .where('journey_id', journeyId)
        .whereNull('entrance_id'),
    )
    if (r.results?.length) {
        const users = await User.findMap(r.results.map(s => s.user_id))
        return {
            ...r,
            results: r.results.map(s => ({
                id: s.id,
                user: users.get(s.user_id),
                created_at: s.created_at,
                updated_at: s.updated_at,
                ended_at: s.ended_at,
            })),
        }
    }
    return r
}

export const pagedEntrancesByUser = async (userId: number, params: PageParams) => {
    const r = await JourneyUserStep.search(params, q => q
        .where('user_id', userId)
        .whereNull('entrance_id'),
    )
    if (r.results?.length) {
        const journeys = await Journey.findMap(r.results.map(s => s.journey_id))
        return {
            ...r,
            results: r.results.map(s => ({
                id: s.id,
                entrance_id: s.id,
                journey: journeys.get(s.journey_id),
                created_at: s.created_at,
                updated_at: s.updated_at,
                ended_at: s.ended_at,
            })),
        }
    }
    return r
}

export const pagedUsersByStep = async (stepId: number, params: PageParams) => {
    const r = await JourneyUserStep.search(params, q => q
        .where('step_id', stepId)
        .orderBy('id', 'desc'),
    )
    if (r.results?.length) {
        const users = await User.findMap(r.results.map(s => s.user_id))
        return {
            ...r,
            results: r.results.map(s => ({
                id: s.id,
                user: users.get(s.user_id),
                type: s.type,
                delay_until: s.delay_until,
                created_at: s.created_at,
                updated_at: s.updated_at,
                ended_at: s.ended_at,
            })),
        }
    }
    return r
}

export const getEntranceLog = async (entranceId: number) => {
    const userSteps = await JourneyUserStep.all(q => q
        .where(function() {
            return this.where('id', entranceId).orWhere('entrance_id', entranceId)
        })
        .orderBy('id', 'asc'),
    )
    if (!userSteps.length) return userSteps
    const steps = await JourneyStep.findMap(userSteps.map(s => s.step_id))
    for (const userStep of userSteps) {
        userStep.step = steps.get(userStep.step_id)
    }
    return userSteps
}

export const getJourneyUserStepByExternalId = async (journeyId: number, userId: number, externalId: string, db?: Database): Promise<JourneyUserStep | undefined> => {
    return await JourneyUserStep.first(
        qb => qb.leftJoin('journey_steps', 'journey_steps.id', 'journey_user_step.step_id')
            .where('journey_user_step.journey_id', journeyId)
            .where('journey_steps.external_id', externalId)
            .where('journey_user_step.user_id', userId)
            .select('journey_user_step.*'),
        db,
    )
}

export const exitUserFromJourney = async (userId: number, entranceId: number, journeyId: number) => {
    await JourneyUserStep.update(
        q => q.where('user_id', userId)
            .where('id', entranceId)
            .whereNull('ended_at')
            .where('journey_id', journeyId),
        { ended_at: new Date() },
    )
}
