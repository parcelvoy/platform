import App from '../app'
import { Database } from '../config/database'
import { RequestError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { JourneyStep, JourneyEntrance, JourneyUserStep, JourneyStepMap, toJourneyStepMap, JourneyStepChild } from './JourneyStep'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'

export const pagedJourneys = async (params: PageParams, projectId: number) => {
    const result = await Journey.search(
        { ...params, fields: ['name'] },
        b => {
            b = b.where({ project_id: projectId })
            params.tag?.length && b.whereIn('id', createTagSubquery(Journey, projectId, params.tag))
            return b
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
    return db.transaction(async trx => {
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
}

export const deleteJourney = async (id: number): Promise<void> => {
    await Journey.updateAndFetch(id, { deleted_at: new Date() })
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

export const setJourneyStepMap = async (journeyId: number, stepMap: JourneyStepMap) => {
    return await App.main.db.transaction(async trx => {

        const [steps, children] = await Promise.all([
            getJourneySteps(journeyId, trx),
            getJourneyStepChildren(journeyId, trx),
        ])

        // Create or update steps
        for (const [external_id, { type, x = 0, y = 0, data = {}, data_key }] of Object.entries(stepMap)) {
            const idx = steps.findIndex(s => s.external_id === external_id)
            if (idx === -1) {
                steps.push(await JourneyStep.insertAndFetch({
                    journey_id: journeyId,
                    type,
                    external_id,
                    data,
                    data_key,
                    x,
                    y,
                }, trx))
            } else {
                const step = steps[idx]
                steps[idx] = await JourneyStep.updateAndFetch(step.id, {
                    type,
                    external_id,
                    data,
                    data_key,
                    x,
                    y,
                }, trx)
            }
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
            for (const { external_id, data = {} } of list) {
                const child = steps.find(s => s.external_id === external_id)
                if (!child) continue
                const idx = children.findIndex(sc => sc.step_id === step.id && sc.child_id === child.id)
                let stepChild: JourneyStepChild
                if (idx === -1) {
                    children.push(stepChild = await JourneyStepChild.insertAndFetch({
                        step_id: step.id,
                        child_id: child.id,
                        data,
                        priority: ci,
                    }, trx))
                } else {
                    stepChild = children[idx]
                    children[idx] = await JourneyStepChild.updateAndFetch(stepChild.id, {
                        data,
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
