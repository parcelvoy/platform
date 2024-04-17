import { User } from '../users/User'
import App from '../app'
import { ProjectRulePath } from '../rules/ProjectRulePath'
import { UserEvent } from '../users/UserEvent'
import { reservedPaths } from '../rules/RuleHelpers'

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

export function addLeafPaths(set: Set<string>, value: any, path = '$') {
    if (typeof value === 'undefined') return
    if (Array.isArray(value)) {
        for (const item of value) {
            addLeafPaths(set, item, path + '[*]')
        }
    } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
            addLeafPaths(set, item, joinPath(path, key))
        }
    } else {
        if (path !== '$') {
            set.add(path)
        }
    }
}

const joinPath = (path: string, key: string) => {
    const isValid = key.match(/^[\p{L}][\p{L}\p{N}_]*$/u)
    if (isValid) return `${path}.${key}`
    return `${path}['${key}']`
}

interface SyncProjectRulePathsParams {
    project_id: number
    updatedAfter?: Date
}

export async function syncUserDataPaths({
    project_id,
    updatedAfter,
}: SyncProjectRulePathsParams) {
    await App.main.db.transaction(async trx => {

        const userPaths = new Set<string>()
        const eventPaths = new Map<string, Set<string>>()

        const userQuery = User.query(trx)
            .where('project_id', project_id)
            .select('data')
        if (updatedAfter) {
            userQuery.where('updated_at', '>=', updatedAfter)
        }
        await userQuery.stream(async function(stream) {
            for await (const { data } of stream) {
                addLeafPaths(userPaths, data)
            }
        })
        for (const path of reservedPaths.user) {
            userPaths.add(joinPath('$', path))
        }

        const eventQuery = UserEvent.query(trx)
            .where('project_id', project_id)
            .select('name', 'data')
        if (updatedAfter) {
            eventQuery.where('created_at', '>=', updatedAfter)
        }

        await eventQuery.stream(async function(stream) {
            for await (const { name, data } of stream) {
                let set = eventPaths.get(name)
                if (!set) {
                    eventPaths.set(name, set = new Set())
                }
                addLeafPaths(set, data)
                for (const path of reservedPaths.event) {
                    set.add(joinPath('$', path))
                }
            }
        })

        const existing = await ProjectRulePath.all(q => q.where('project_id', project_id), trx)

        if (!updatedAfter && existing.length) {
            const removeIds: number[] = []
            let i = 0
            let remove = false
            while (i < existing.length) {
                const e = existing[i]
                if (e.type === 'user') {
                    remove = !userPaths.has(e.path)
                } else if (e.type === 'event') {
                    remove = !eventPaths.get(e.name ?? '')?.has(e.path)
                } else {
                    remove = true
                }
                if (remove) {
                    removeIds.push(e.id)
                    existing.splice(i, 1)
                } else {
                    i++
                }
            }
            if (removeIds.length) {
                await ProjectRulePath.delete(q => q.whereIn('id', removeIds), trx)
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

        for (const [name, paths] of eventPaths.entries()) {
            for (const path of paths) {
                if (!existing.find(e => e.type === 'event' && e.path === path && e.name === name)) {
                    await ProjectRulePath.insert({
                        project_id,
                        path,
                        name,
                        type: 'event',
                    }, trx)
                }
            }
        }

    })
}
