import { User } from '../users/User'
import App from '../app'
import { ProjectRulePath, RulePathDataType } from '../rules/ProjectRulePath'
import { UserEvent } from '../users/UserEvent'
import { reservedPathDataType, reservedPaths } from '../rules/RuleHelpers'
import { KeyedSet } from '../utilities'

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

export function addLeafPaths(set: KeyedSet<[string, RulePathDataType]>, value: any, path = '$') {
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
            const type = inferDataType(value)
            set.add([path, type])
        }
    }
}

const joinPath = (path: string, key: string) => {
    const isValid = key.match(/^[\p{L}][\p{L}\p{N}_]*$/u)
    if (isValid) return `${path}.${key}`
    return `${path}['${key}']`
}

const inferDataType = (value: any): RulePathDataType => {
    if (Array.isArray(value)) {
        return 'array'
    }
    if (typeof value === 'string') {
        return 'string'
    }
    if (value instanceof Date) {
        return 'date'
    }
    if (typeof value === 'number') {
        return 'number'
    }
    if (typeof value === 'boolean') {
        return 'boolean'
    }
    return 'string'
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

        const userPaths = new KeyedSet<[string, RulePathDataType]>(item => item[0])
        const eventPaths = new Map<string, KeyedSet<[string, RulePathDataType]>>()

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
            userPaths.add([joinPath('$', path), reservedPathDataType(path)])
        }

        const eventQuery = await UserEvent.clickhouse().query(`SELECT name, data FROM user_events WHERE project_id = {projectId: UInt32} ${updatedAfter ? 'AND created_at >= {updatedAfter: DateTime64(3, \'UTC\')}' : ''}`, {
            projectId: project_id,
            updatedAfter,
        })

        for await (const chunk of eventQuery.stream() as any) {
            for (const result of chunk) {
                const { name, data } = result.json()
                let set = eventPaths.get(name)
                if (!set) {
                    set = new KeyedSet<[string, RulePathDataType]>(item => item[0])
                    eventPaths.set(name, set)
                }
                addLeafPaths(set, data)
                for (const path of reservedPaths.event) {
                    set.add([joinPath('$', path), reservedPathDataType(path)])
                }
            }
        }

        const existing = await ProjectRulePath.all(q => q.where('project_id', project_id), trx)

        if (!updatedAfter && existing.length) {
            const removeIds: number[] = []
            for (const { id, name, type, path } of existing) {
                let remove = false
                if (type === 'user') {
                    remove = !userPaths.has(path)
                } else if (type === 'event') {
                    remove = !eventPaths.get(name ?? '')?.has(path)
                } else {
                    remove = true
                }
                if (remove) {
                    removeIds.push(id)
                }
            }

            if (removeIds.length) {
                await ProjectRulePath.delete(q => q.whereIn('id', removeIds), trx)
            }
        }

        // add all new paths
        for (const [path, data_type] of userPaths) {
            if (!existing.find(e => e.type === 'user' && e.path === path)) {
                await ProjectRulePath.insert({
                    project_id,
                    path,
                    data_type,
                    type: 'user',
                }, trx)
            }
        }

        for (const [name, paths] of eventPaths.entries()) {
            for (const [path, data_type] of paths) {
                if (!existing.find(e => e.type === 'event' && e.path === path && e.name === name)) {
                    await ProjectRulePath.insert({
                        project_id,
                        path,
                        data_type,
                        name,
                        type: 'event',
                    }, trx)
                }
            }
        }
    })
}
