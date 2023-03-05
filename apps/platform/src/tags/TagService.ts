import { Database } from 'config/database'
import Model from 'core/Model'
import { EntityTag, Tag } from './Tag'

// use transaction?
export async function setTags<T extends Model & { project_id: number }>(target: T, names: string[]) {

    // is there a better way to do this?
    const tableName = (Object.getPrototypeOf(target) as typeof Model).tableName
    const { project_id } = target

    // if empty value passed, remove all tag relations
    if (!names?.length) {
        return await EntityTag.delete(b => b.where({
            entity: tableName,
            entity_id: target.id,
        }))
    }

    // find/create tags in this project by name
    const tags = await Tag.all(b => b.where({
        project_id,
        names,
    }))

    for (const name of names) {
        if (!tags.find(t => t.name === name)) {
            tags.push(await Tag.insertAndFetch({
                project_id,
                name,
            }))
        }
    }

    const relations = await EntityTag.all(b => b.where({
        entity: tableName,
        entity_id: target.id,
    }))

    for (const tag of tags) {
        if (!relations.find(r => r.tag_id === tag.id)) {
            await EntityTag.insert({
                entity: tableName,
                entity_id: target.id,
                tag_id: tag.id,
            })
        }
    }

    const remove = relations.filter(r => !tags.find(t => t.id === r.tag_id)).map(r => r.id)
    if (remove.length) {
        await EntityTag.delete(b => b.whereIn('id', remove))
    }

    return names
}

// use with knex:  myQuery.whereIn('id', createTagSubquery(MyEntity, 1, ['tag 1', 'tag 2']))
export function createTagSubquery<T extends typeof Model>(model: T, project_id: number, names: string[]) {
    return EntityTag.query()
        .select('entity_id')
        .join('tags', 'tag_id', 'tag.id')
        .whereIn('tag.name', names)
        .andWhere('tag.project_id', project_id)
        .andWhere('entity', model.tableName)
        .groupBy('tag.id')
        .having(model.raw(`count(*) > ${names.length}`))
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
