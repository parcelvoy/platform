import App from '../app'
import { Database } from '../config/database'
import { RequestError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import Journey, { JourneyParams, UpdateJourneyParams } from './Journey'
import { JourneyStep, JourneyEntrance, JourneyUserStep, JourneyStepMap, toJourneyStepMap, JourneyStepChild } from './JourneyStep'
import { raw } from '../core/Model'
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

export const getJourneyStepChildren = async (stepId: number) => {
    return await JourneyStepChild.all(q => q
        .where('step_id', stepId)
        .orderBy('priority', 'asc')
        .orderBy('id', 'asc'),
    )
}

const getAllJourneyStepChildren = async (journeyId: number, db?: Database): Promise<JourneyStepChild[]> => {
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
        for (const [external_id, { type, x = 0, y = 0, data = {} }] of Object.entries(stepMap)) {
            const idx = steps.findIndex(s => s.external_id === external_id)
            if (idx === -1) {
                steps.push(await JourneyStep.insertAndFetch({
                    journey_id: journeyId,
                    type,
                    external_id,
                    data,
                    x,
                    y,
                }, trx))
            } else {
                const step = steps[idx]
                steps[idx] = await JourneyStep.updateAndFetch(step.id, {
                    type,
                    external_id,
                    data,
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

interface JourneyStepStats {
    [external_id: string]: {
        completions: number
        waiting: number
    }
}

export const getJourneyStepStats = async (journeyId: number) => {

    const [steps, completions, waiting] = await Promise.all([
        getJourneySteps(journeyId),
        (JourneyUserStep.query()
            .select('step_id')
            .count('* as users')
            .where('journey_id', journeyId)
            .groupBy('step_id')
        ) as Promise<Array<{ step_id: number, users: number }>>,
        (JourneyUserStep.query()
            .with(
                'latest_journey_steps',
                raw('SELECT step_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn FROM journey_user_step where journey_id = ' + journeyId),
            )
            .select('step_id')
            .count('* as users')
            .from('latest_journey_steps')
            .where('rn', 1)
            .groupBy('step_id')
        ) as Promise<Array<{ step_id: number, users: number }>>,
    ])

    return steps.reduce<JourneyStepStats>((a, { external_id, id }) => {
        a[external_id] = {
            completions: completions.find(uc => uc.step_id === id)?.users ?? 0,
            waiting: waiting.find(uc => uc.step_id === id)?.users ?? 0,
        }
        return a
    }, {})
}
