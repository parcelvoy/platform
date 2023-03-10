import { Database } from 'config/database'
import Model from 'core/Model'
import { EntityTag, Tag } from './Tag'

export async function getTags(entity: string, entityIds: number[], db?: Database) {
    return await EntityTag
        .query(db)
        .select('entity_id as entityId')
        .select('tags.name as name')
        .join('tags', 'tag_id', '=', 'tags.id')
        .whereIn('entity_id', entityIds)
        .andWhere('entity', entity)
        .orderBy('tags.name', 'asc')
        .then((r: Array<{ entityId: number, name: string }>) => r.reduce((a, { entityId, name }) => {
            const list = a.get(entityId) ?? a.set(entityId, []).get(entityId)!
            list.push(name)
            return a
        }, new Map<number, string[]>()))
}

interface SetTagsParams {
    project_id: number
    entity: string
    entity_id: number
    names: string[]
}

export async function setTags({
    project_id,
    entity,
    entity_id,
    names,
}: SetTagsParams, db?: Database) {

    // if empty value passed, remove all tag relations
    if (!names?.length) {
        await EntityTag.delete(b => b.where({
            entity,
            entity_id,
        }), db)
        return []
    }

    // find/create tags in this project by name
    const tags = await Tag.all(b => b.whereIn('name', names).andWhere('project_id', project_id), db)

    for (const name of names) {
        if (!tags.find(t => t.name === name)) {
            tags.push(await Tag.insertAndFetch({
                project_id,
                name,
            }, db))
        }
    }

    const relations = await EntityTag.all(b => b.where({
        entity,
        entity_id,
    }), db)

    for (const tag of tags) {
        if (!relations.find(r => r.tag_id === tag.id)) {
            await EntityTag.insert({
                entity,
                entity_id,
                tag_id: tag.id,
            }, db)
        }
    }

    const remove = relations.filter(r => !tags.find(t => t.id === r.tag_id)).map(r => r.id)
    if (remove.length) {
        await EntityTag.delete(b => b.whereIn('id', remove), db)
    }

    return names
}

// use with knex:  myQuery.whereIn('id', createTagSubquery(MyEntity, 1, ['tag 1', 'tag 2']))
export function createTagSubquery<T extends typeof Model>(model: T, project_id: number, names: string[]) {
    const sq = EntityTag.query()
        .select('entity_id')
        .join('tags', 'tag_id', '=', 'tags.id')
        .whereIn('tags.name', names)
        .andWhere('tags.project_id', project_id)
        .andWhere('entity', model.tableName)
        .groupBy('entity_id')
        .having(model.raw(`count(*) >= ${names.length}`))
    return sq
}

export async function getUsedTags(projectId: number, entity: string, db?: Database): Promise<{
    id: number
    name: string
    count: number
}> {
    return await EntityTag.query(db)
        .select('tags.id as id')
        .select('tags.name as name')
        .countDistinct('entity_id as count')
        .join('tags', 'tag_id', '=', 'tags.id')
        .where('entity', entity)
        .andWhere('tags.project_id', projectId)
        .groupBy('tag_id')
        .orderBy('tags.name', 'asc')
}
