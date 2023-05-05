import App from '../app'
import { Database } from '../config/database'
import { ProjectRulePath } from './ProjectRulePath'

interface GetDistinctPathsParams {
    source: 'users' | 'user_events'
    project_id: number
    db?: Database
    delta?: Date // for loading delta
}

const rx = /\[\d+\]/g

export async function getDistinctPaths({
    db = App.main.db,
    delta,
    project_id,
    source,
}: GetDistinctPathsParams) {

    let sql = `
        select distinct x.p
        from :source:,
            json_table(json_search(data, 'all', '%'), '$[*]' columns (p varchar(255) path '$')) x
        where :source:.project_id = :project_id`

    if (delta) {
        sql += ' and updated_at >= :delta'
    }

    return await db.raw(sql, {
        source,
        project_id,
        delta,
    }).then(x => x[0].map((y: any) => y.p))
        .then((paths: string[]) => paths
            .map(p => p.replace(rx, '[*]'))
            .filter((o, i, a) => a.indexOf(o) === i),
        )
}

interface SyncProjectRulePathsParams {
    project_id: number
    delta?: Date
}

export async function syncProjectRulePaths({
    project_id,
    delta,
}: SyncProjectRulePathsParams) {

    if (delta && !(delta instanceof Date)) {
        delta = new Date(delta)
    }

    await App.main.db.transaction(async trx => {

        const userPaths = await getDistinctPaths({
            source: 'users',
            project_id,
            db: trx,
            delta,
        })

        const eventPaths = await getDistinctPaths({
            source: 'user_events',
            project_id,
            db: trx,
            delta,
        })

        const existing = await ProjectRulePath.all(q => q.where('project_id', project_id), trx)

        // don't remove existing ones for delta
        if (!delta) {
            const deleteIds: number[] = []
            for (const { id, path, type } of existing) {
                if (
                    (type === 'user' && !userPaths.includes(path))
                    || (type === 'event' && !eventPaths.includes(path))
                ) {
                    deleteIds.push(id)
                }
            }
            if (deleteIds.length) {
                await ProjectRulePath.delete(q => q.whereIn('id', deleteIds), trx)
            }
        }

        // add all new paths
        for (const path of userPaths) {
            if (!existing.find(e => e.type === 'user' && e.path === path)) {
                await ProjectRulePath.insert({
                    project_id,
                    path,
                    type: 'user',
                }, trx)
            }
        }
        for (const path of eventPaths) {
            if (!existing.find(e => e.type === 'event' && e.path === path)) {
                await ProjectRulePath.insert({
                    project_id,
                    path,
                    type: 'event',
                }, trx)
            }
        }
    })
}
