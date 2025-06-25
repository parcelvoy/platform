import { formatISO } from 'date-fns'
import App from '../../app'
import { Database, Query } from '../../config/database'
import { SearchResult } from '../Model'
import { RawModel } from './RawModel'
import { PageQueryParams } from '../searchParams'

export type Transaction = Database.Transaction

export const raw = (raw: Database.Value, db: Database = App.main.db) => {
    return db.raw(raw)
}

export const ref = (ref: string, db: Database = App.main.db) => {
    return db.ref(ref)
}

export class SQLModel extends RawModel {

    created_at: Date = new Date()
    updated_at!: Date

    static formatDb(json: any): Record<string, unknown> {

        const obj = { ...json }

        // All models have an updated timestamp, trigger value
        obj.updated_at = new Date()

        // Take JSON attributes and stringify before insertion
        for (const attribute of this.jsonAttributes) {
            obj[attribute] = obj[attribute] == null
                ? undefined
                : JSON.stringify(obj[attribute])
        }

        return this.formatJson(obj)
    }

    static query<T extends typeof SQLModel>(this: T, db: Database = App.main.db): Database.QueryBuilder<InstanceType<T>> {
        return this.table(db)
    }

    static async first<T extends typeof SQLModel>(
        this: T,
        query: Query = (qb) => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        const record = await this.build(query, db).first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async find<T extends typeof SQLModel>(
        this: T,
        id: number | string | undefined,
        query: Query = (qb) => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        if (!id) return undefined
        if (typeof id === 'string') {
            id = parseInt(id, 10)
            if (isNaN(id)) return undefined
        }
        const record = await this.build(query, db)
            .where(`${this.tableName}.id`, id)
            .first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async all<T extends typeof SQLModel>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T>[]> {
        const records = await this.build(query, db)
        return records.map((item: any) => this.fromJson(item))
    }

    static async count<T extends typeof SQLModel>(
        this: T,
        query: Query = qb => qb,
        column?: string,
        db: Database = App.main.db,
    ): Promise<number> {
        return await query(this.table(db))
            .clone()
            .clearSelect()
            .count(column ? `${column} AS C` : `${this.tableName}.id as C`)
            .then(r => r[0].C || 0)
    }

    static async exists<T extends typeof SQLModel>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<boolean> {
        const count = await this.count(qb => query(qb).limit(1), '*', db)
        return count > 0
    }

    static async search<T extends typeof SQLModel>(
        this: T,
        params: PageQueryParams<T>,
        query: Query = qb => qb,
        db: Database = App.main.db,
        postProcessor: (item: InstanceType<T>) => InstanceType<T> = item => item,
    ): Promise<SearchResult<InstanceType<T>>> {
        const {
            cursor,
            page = 'next',
            limit,
            sort,
            direction = 'asc',
            mode = 'partial',
            fields = [],
            q,
            id,
        } = params

        // Based on if we are moving forward or backward we need to
        // change how the cursor `where` clause works
        const cursorDir = page === 'next'
            ? direction === 'asc' ? '>' : '<'
            : direction === 'asc' ? '<=' : '>='

        const data = await this.build(query, db)
            .limit((limit + 1)) // Get one extra to check for more
            .clear('order') // QB cannot contain order
            .when(!!sort, qb =>
                // If sort is provided, order by that first, then by id
                // for consistency
                qb.orderBy(sort!, direction)
                    .orderBy(`${this.tableName}.id`, direction),
            )
            .when(!!cursor, qb => {
                // To allow for sorting, `since` may contain either just
                // a last token or a last token and the last value of
                // the column you are sorting by
                const [sinceId, sortSince] = cursor!.split(',')
                if (sortSince) {
                    qb.whereRaw(`(??, \`${this.tableName}\`.\`id\`) ${cursorDir} (?, ?)`, [sort, sortSince!, sinceId])
                } else {
                    qb.where(`${this.tableName}.id`, cursorDir, sinceId)
                }
                return qb
            })
            .when(!!q, qb => {
                // Filter results by search query in either
                // exact or partial mode
                const filter = mode === 'exact'
                    ? params.q
                    : '%' + params.q + '%'
                return qb.where(function() {
                    fields.reduce((chain, field) => {
                        if (typeof field === 'string') {
                            return chain.orWhereILike(field, filter)
                        }
                        return chain
                    }, this)
                })
            })
            .when(!!id?.length, qb => qb.whereIn('id', id!))

        const makeCursor = (result: any, sort?: string) => {
            if (!sort || sort === 'id' || sort === `${this.tableName}.id`) return `${result.id}`
            let sortCursor = result[sort]
            if (sortCursor instanceof Date) {
                sortCursor = formatISO(sortCursor)
            }
            return `${result.id},${sortCursor}`
        }

        // Slice off the extra result so that the true limit is provided
        const results = data.slice(0, limit)
        const resultCount = results.length
        const hasMore = resultCount < data.length

        // End result is either first or last result depending on direction
        const endResult = page === 'next' ? results[resultCount - 1] : results[0]

        // If there are more items fetched than after slicing we know
        // there are more pages
        const endCursor = endResult && hasMore
            ? makeCursor(endResult, sort)
            : undefined
        const startCursor = cursor

        // Return the results, cursors (they flip based on direction) and limit
        return {
            results: results.map((item: any) => postProcessor(this.fromJson(item))),
            nextCursor: page === 'next' ? endCursor : startCursor,
            prevCursor: page === 'next' ? startCursor : endCursor,
            limit,
        }
    }

    static async insert<T extends typeof SQLModel>(this: T, data: Partial<InstanceType<T>>, db?: Database): Promise<number>
    static async insert<T extends typeof SQLModel>(this: T, data: Partial<InstanceType<T>>[], db?: Database): Promise<number[]>
    static async insert<T extends typeof SQLModel>(
        this: T,
        data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[] = {},
        db: Database = App.main.db,
    ): Promise<number | number[]> {
        const formattedData = Array.isArray(data) ? data.map(o => this.formatDb(o)) : this.formatDb(data)
        const value = await this.table(db).insert(formattedData)
        if (Array.isArray(data)) return value
        return value[0]
    }

    static async insertAndFetch<T extends typeof SQLModel>(
        this: T,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<InstanceType<T>> {
        const id = await this.insert(data, db)
        const model = await this.find(id, b => b, db) as InstanceType<T>
        this.emit('created', model)
        return model
    }

    static async update<T extends typeof SQLModel>(
        this: T,
        query: Query,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<number> {
        const formattedData = this.formatDb(data)
        return await query(this.table(db)).update(formattedData)
    }

    static async updateAndFetch<T extends typeof SQLModel>(
        this: T,
        id: number,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<InstanceType<T>> {
        const formattedData = this.formatDb(data)
        await this.table(db).where('id', id).update(formattedData)
        const model = await this.find(id, b => b, db) as InstanceType<T>
        this.emit('updated', model)
        return model
    }

    static async archive<T extends typeof SQLModel>(
        this: T,
        id: number,
        query: Query = qb => qb,
        fields: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<InstanceType<T>> {
        await query(this.table(db))
            .where('id', id)
            .update({ ...fields, deleted_at: new Date() })
        const model = await this.find(id, b => b, db) as InstanceType<T>
        this.emit('archived', id)
        return model
    }

    static async delete<T extends typeof SQLModel>(
        this: T,
        query: Query,
        db: Database = App.main.db,
    ): Promise<number> {
        return await query(this.table(db)).delete()
    }

    static async deleteById<T extends typeof SQLModel>(
        this: T,
        id: number,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<boolean> {
        const model = await this.find(id, query, db) as InstanceType<T>
        const count = await query(this.table(db))
            .where('id', id)
            .delete()
        this.emit('deleted', model)
        return count > 0
    }

    static scroll = async function * <T extends typeof SQLModel>(
        this: T,
        query: Query = qb => qb,
        batchSize = 100,
        db: Database = App.main.db,
    ): AsyncGenerator<InstanceType<T>[]> {
        let cursor = 0
        while (true) {
            const batch = await this.build(query, db)
                .where(`${this.tableName}.id`, '>', cursor)
                .clearOrder()
                .orderBy(`${this.tableName}.id`, 'asc')
                .limit(batchSize)
            if (batch.length) {
                yield batch.map((o: any) => this.fromJson(o))
                if (batch.length === batchSize) {
                    cursor = batch.at(-1)!.id
                    continue
                }
            }
            break
        }
    }

    static table(db: Database = App.main.db): Database.QueryBuilder<any> {
        return db(this.tableName)
    }

    static raw = raw

    static build<T extends typeof SQLModel>(
        query: Query,
        db: Database = App.main.db,
    ): Database.QueryBuilder<InstanceType<T>> {
        const builder = query(this.table(db)) as any
        const hasSelects = builder._statements.find((item: any) => item.grouping === 'columns')
        if (!hasSelects) {
            builder.select(`${this.tableName}.*`)
        }
        return builder
    }

    static emit(event: string, payload: any) {
        App.main.events.emit(`model:${this.tableName}:${event}`, payload)
    }
}
