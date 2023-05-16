import App from '../app'
import { ProjectRulePath } from './ProjectRulePath'

export async function listUserPaths(project_id: number) {
    const paths: Array<{ path: string }> = await ProjectRulePath.query()
        .select('path')
        .where('type', 'user')
        .where('project_id', project_id)
    return paths.map(p => p.path)
}

export async function listEventNames(project_id: number) {
    return await ProjectRulePath.query()
        .distinct()
        .where('project_id', project_id)
        .where('type', 'event')
        .orderBy('name')
        .pluck('name')
        .then(list => list.filter(Boolean) as string[])
}

export async function listEventPaths(project_id: number, name: string) {
    const paths: Array<{ path: string }> = await ProjectRulePath.query()
        .select('path')
        .where('type', 'event')
        .where('name', name)
        .where('project_id', project_id)
    return paths.map(p => p.path)
}

const rx = /\[\d+\]/g

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

        const userPaths = await trx.raw(`
            select distinct x.p
            from users,
                json_table(json_search(data, 'all', '%'), '$[*]' columns (p varchar(255) path '$')) x
            where project_id = :project_id ${delta ? 'and update_date >= :delta' : ''};
        `, {
            project_id,
            delta,
        }).then(x => x[0].map((y: any) => y.p))
            .then((paths: string[]) => paths
                .map(p => p.replace(rx, '[*]'))
                .filter((o, i, a) => a.indexOf(o) === i),
            )

        const eventPaths = await trx.raw(`
            with
                paths as (
                    select e.name as 'name', x.p as 'path'
                    from user_events e,
                        json_table(json_search(e.data, 'all', '%'), '$[*]' columns (p varchar(255) path '$')) x 
                    where e.project_id = :project_id ${delta ? ' and e.update_date >= :delta' : ''}
                )
            select name, path from paths group by name, path;
        `, {
            project_id,
            delta,
        }).then(x => x[0] as Array<{ name: string; path: string; }>)
            .then(list => list
                .map(p => ({
                    ...p,
                    path: p.path.replace(rx, '[*]'),
                }))
                .filter(({ name, path }, i, a) => a.findIndex(x => x.name === name && x.path === path) === i))

        const existing = await ProjectRulePath.all(q => q.where('project_id', project_id), trx)

        // don't remove existing ones for delta
        if (!delta) {
            const deleteIds: number[] = []
            for (const { id, path, type, name } of existing) {
                if (
                    (type === 'user' && !userPaths.includes(path))
                    || (type === 'event' && !eventPaths.find(x => x.path === path && x.name === name))
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
        for (const { name, path } of eventPaths) {
            if (!existing.find(e => e.type === 'event' && e.path === path && e.name === name)) {
                await ProjectRulePath.insert({
                    project_id,
                    path,
                    name,
                    type: 'event',
                }, trx)
            }
        }
    })
}
