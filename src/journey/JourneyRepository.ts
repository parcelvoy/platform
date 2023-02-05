import App from '../app'
import { Database } from 'config/database'
import { RequestError } from '../core/errors'
import { SearchParams } from '../core/searchParams'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { JourneyStep, JourneyEntrance, JourneyUserStep, JourneyStepMap, toJourneyStepMap, JourneyStepChild } from './JourneyStep'

export const pagedJourneys = async (params: SearchParams, projectId: number) => {
    return await Journey.searchParams(
        params,
        ['name'],
        b => b.where({ project_id: projectId }),
    )
}

export const allJourneys = async (projectId: number): Promise<Journey[]> => {
    return await Journey.all(qb => qb.where('project_id', projectId))
}

export const createJourney = async (projectId: number, params: JourneyParams): Promise<Journey> => {
    return App.main.db.transaction(async trx => {

        const journey = await Journey.insertAndFetch({
            ...params,
            project_id: projectId,
        }, trx)

        // auto-create entrance step
        await JourneyEntrance.create(journey.id)

        return journey
    })
}

export const getJourney = async (id: number, projectId: number): Promise<Journey> => {
    const journey = await Journey.find(id, qb => qb.where('project_id', projectId))
    if (!journey) throw new RequestError('Journey not found', 404)
    return journey
}

export const updateJourney = async (id: number, params: UpdateJourneyParams): Promise<Journey> => {
    return await Journey.updateAndFetch(id, params)
}

export const deleteJourney = async (id: number): Promise<void> => {
    await Journey.updateAndFetch(id, { deleted_at: new Date() })
}

export const getJourneySteps = async (journeyId: number, db?: Database): Promise<JourneyStep[]> => {
    return await JourneyStep.all(qb => qb.where('journey_id', journeyId), db)
}

export const getJourneyStepChildren = async (stepId: number) => {
    return await JourneyStepChild.all(q => q.where('step_id', stepId))
}

const getAllJourneyStepChildren = async (journeyId: number, db?: Database): Promise<JourneyStepChild[]> => {
    return await JourneyStepChild.all(
        q => q.whereIn('step_id', JourneyStep.query(db).select('id').where('journey_id', journeyId)),
        db,
    )
}

export const getJourneyStepMap = async (journeyId: number) => {
    const [steps, children] = await Promise.all([
        getJourneySteps(journeyId),
        getAllJourneyStepChildren(journeyId),
    ])
    return toJourneyStepMap(steps, children)
}

export const setJourneyStepMap = async (journeyId: number, stepMap: JourneyStepMap) => {
    return await App.main.db.transaction(async trx => {

        const [steps, children] = await Promise.all([
            getJourneySteps(journeyId, trx),
            getAllJourneyStepChildren(journeyId, trx),
        ])

        // Create or update steps
        for (const [uuid, { type, x = 0, y = 0, data = {} }] of Object.entries(stepMap)) {
            const idx = steps.findIndex(s => s.uuid === uuid)
            if (idx === -1) {
                steps.push(await JourneyStep.insertAndFetch({
                    journey_id: journeyId,
                    type,
                    uuid,
                    data,
                    x,
                    y,
                }, trx))
            } else {
                const step = steps[idx]
                steps[idx] = await JourneyStep.updateAndFetch(step.id, {
                    type,
                    uuid,
                    data,
                    x,
                    y,
                }, trx)
            }
        }

        // Delete removed or unused steps
        let i = 0
        while (i < steps.length) {
            const step = steps[i]
            if (!stepMap[step.uuid]) {
                await JourneyStep.delete(q => q.where('id', step.id), trx)
                steps.splice(i, 1)
                continue
            }
            i++
        }

        for (const step of steps) {
            const list = stepMap[step.uuid]?.children ?? []
            const childIds: number[] = []

            for (const { uuid, data = {} } of list) {
                const child = steps.find(s => s.uuid === uuid)
                if (!child) continue
                const idx = children.findIndex(sc => sc.step_id === step.id && sc.child_id === child.id)
                let stepChild: JourneyStepChild
                if (idx === -1) {
                    children.push(stepChild = await JourneyStepChild.insertAndFetch({
                        step_id: step.id,
                        child_id: child.id,
                        data,
                    }, trx))
                } else {
                    stepChild = children[idx]
                    children[idx] = await JourneyStepChild.updateAndFetch(stepChild.id, {
                        data,
                    }, trx)
                }
                childIds.push(stepChild.child_id)
            }

            i = 0
            while (i < children.length) {
                const stepChild = children[i]
                if (stepChild.step_id === step.id && !childIds.includes(stepChild.child_id)) {
                    await JourneyStepChild.delete(q => q.where('id', stepChild.id), trx)
                    children.splice(i, 1)
                    continue
                }
                i++
            }
        }

        return toJourneyStepMap(steps, children)
    })
}

export const getJourneyStep = async (id?: number): Promise<JourneyStep | undefined> => {
    if (!id) return
    return await JourneyStep.first(db => db.where('id', id))
}

export const getUserJourneyIds = async (userId: number): Promise<number[]> => {
    return await JourneyUserStep.all(
        db => db.where('user_id', userId)
            .select('journey_id'),
    ).then(items => items.map(item => item.journey_id))
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
