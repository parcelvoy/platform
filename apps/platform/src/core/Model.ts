import { formatISO } from 'date-fns'
import App from '../app'
import { Database, Query } from '../config/database'
import { snakeCase, pluralize } from '../utilities'
import { PageQueryParams } from './searchParams'

export const raw = (raw: Database.Value, db: Database = App.main.db) => {
    return db.raw(raw)
}

export interface SearchResult<T> {
    results: T[]
    nextCursor?: string
    prevCursor?: string
    limit: number
}

export default class Model {

    id!: number
    created_at: Date = new Date()
    updated_at: Date = new Date()

    static jsonAttributes: string[] = []
    static virtualAttributes: string[] = []

    static fromJson<T extends typeof Model>(this: T, json: Partial<InstanceType<T>>): InstanceType<T> {
        const model = new this()

        // Remove any value that could conflict with a virtual key
        for (const attribute of this.virtualAttributes) {
            delete (json as any)[attribute]
        }

        // Parse values into the model
        model.parseJson(json)
        return model as InstanceType<T>
    }

    parseJson(json: any) {
        Object.assign(this, json)
    }

    toJSON() {
        return (this.constructor as any).toJson(this)
    }

    static toJson<T extends typeof Model>(this: T, model: any) {
        const json: any = {}
        const keys = [...Object.keys(model), ...this.virtualAttributes]
        for (const key of keys) {
            json[snakeCase(key)] = model[key]
        }
        return json
    }

    // Format JSON before inserting into DB
    static formatJson(json: any): Record<string, unknown> {

        // All models have an updated timestamp, trigger value
        json.updated_at = new Date()

        // Take JSON attributes and stringify before insertion
        for (const attribute of this.jsonAttributes) {
            json[attribute] = JSON.stringify(json[attribute])
        }
        return json
    }

    static query<T extends typeof Model>(this: T, db: Database = App.main.db): Database.QueryBuilder<InstanceType<T>> {
        return this.table(db)
    }

    static async first<T extends typeof Model>(
        this: T,
        query: Query,
        db: Database = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        const record = await this.build(query, db).first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async find<T extends typeof Model>(
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

    static async all<T extends typeof Model>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T>[]> {
        const records = await this.build(query, db)
        return records.map((item: any) => this.fromJson(item))
    }

    static async count<T extends typeof Model>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<number> {
        return await query(this.table(db))
            .clone()
            .clearSelect()
            .count(`${this.tableName}.id as C`)
            .then(r => r[0].C || 0)
    }

    static async exists<T extends typeof Model>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<boolean> {
        const count = await this.count(query, db)
        return count > 0
    }

    static async search<T extends typeof Model>(
        this: T,
        params: PageQueryParams<T>,
        query: Query = qb => qb,
        db: Database = App.main.db,
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
                    .orderBy('id', direction),
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
            if (!sort || sort === 'id') return `${result.id}`
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
            results: results.map((item: any) => this.fromJson(item)),
            nextCursor: page === 'next' ? endCursor : startCursor,
            prevCursor: page === 'next' ? startCursor : endCursor,
            limit,
        }
    }

    static async insert<T extends typeof Model>(this: T, data: Partial<InstanceType<T>>, db?: Database): Promise<number>
    static async insert<T extends typeof Model>(this: T, data: Partial<InstanceType<T>>[], db?: Database): Promise<number[]>
    static async insert<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[] = {},
        db: Database = App.main.db,
    ): Promise<number | number[]> {
        const formattedData = this.formatJson(data)
        const value = await this.table(db).insert(formattedData)
        if (Array.isArray(data)) return value
        return value[0]
    }

    static async insertAndFetch<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<InstanceType<T>> {
        const id = await this.insert(data, db)
        return await this.find(id, b => b, db) as InstanceType<T>
    }

    static async update<T extends typeof Model>(
        this: T,
        where: (builder: Database.QueryBuilder<any>) => Database.QueryBuilder<any>,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<number> {
        const formattedData = this.formatJson(data)
        return await where(this.table(db)).update(formattedData)
    }

    static async updateAndFetch<T extends typeof Model>(
        this: T,
        id: number,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<InstanceType<T>> {
        const formattedData = this.formatJson(data)
        await this.table(db).where('id', id).update(formattedData)
        return await this.find(id, b => b, db) as InstanceType<T>
    }

    static async delete<T extends typeof Model>(
        this: T,
        query: Query,
        db: Database = App.main.db,
    ): Promise<number> {
        return await query(this.table(db)).delete()
    }

    static get tableName(): string {
        return pluralize(snakeCase(this.name))
    }

    static table(db: Database = App.main.db): Database.QueryBuilder<any> {
        return db(this.tableName)
    }

    static raw = raw

    static build<T extends typeof Model>(
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
}

export type ModelParams = 'id' | 'created_at' | 'updated_at' | 'parseJson' | 'project_id' | 'toJSON'
