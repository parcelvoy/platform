import App from '../app'
import { Database } from '../config/database'
import { snakeCase, pluralize } from '../utilities'
import { SearchParams } from './searchParams'

export const raw = (raw: Database.Value, db: Database = App.main.db) => {
    return db.raw(raw)
}

type Query = (builder: Database.QueryBuilder<any>) => Database.QueryBuilder<any>

export interface Page<T, B = number> {
    results: T[]
    since_id: B
}

export interface PageParams<B> {
    sinceId: B
    limit: number
    query: Query
}

export interface SearchResult<T> {
    results: T[]
    total: number
    start: number
    end: number
    page: number
    itemsPerPage: number
    pages: number
}

export default class Model {

    id!: number
    created_at: Date = new Date()
    updated_at: Date = new Date()

    static jsonAttributes: string[] = []
    static virtualAttributes: string[] = []

    static fromJson<T extends typeof Model>(this: T, json: Partial<InstanceType<T>>): InstanceType<T> {
        const model = new this()
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

    static formatJson(json: any): Record<string, unknown> {
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
        const record = await query(this.table(db)).first()
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
        const record = await query(this.table(db))
            .where({ id })
            .first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async all<T extends typeof Model>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T>[]> {
        const records = await query(this.table(db))
        return records.map((item: any) => this.fromJson(item))
    }

    static async count<T extends typeof Model>(
        this: T,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<number> {
        return await query(this.table(db)).count('id as C').then(r => r[0].C || 0)
    }

    static async search<T extends typeof Model>(
        this: T,
        query: Query = qb => qb,
        page = 0,
        itemsPerPage = 10,
        db: Database = App.main.db,
    ): Promise<SearchResult<T>> {
        const total = await this.count(query, db)
        const start = page * itemsPerPage
        const results = total > 0
            ? await query(this.table(db)).offset(start).limit(itemsPerPage)
            : []
        const end = Math.min(start + itemsPerPage, start + results.length)
        return {
            results: results.map((item: any) => this.fromJson(item)),
            start,
            end,
            total,
            page,
            itemsPerPage,
            pages: itemsPerPage > 0 ? Math.ceil(total / itemsPerPage) : 1,
        }
    }

    static async searchParams<T extends typeof Model>(
        this: T,
        params: SearchParams,
        fields: Array<keyof InstanceType<T>>,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ) {
        let { page, itemsPerPage, sort, q } = params
        return await this.search(
            b => {
                b = query(b)
                if (q) {
                    const filter = '%' + params.q + '%'
                    b.where(function() {
                        fields.reduce((chain, field, index) => {
                            if (typeof field === 'string') {
                                if (index === 0) {
                                    chain = chain.whereILike(field, filter)
                                } else {
                                    chain = chain.orWhereILike(field, filter)
                                }
                            }
                            return chain
                        }, this)
                    })
                }
                if (sort) {
                    let desc = false
                    if (sort.charAt(0) === '-') {
                        desc = true
                        sort = sort.substring(1)
                    }
                    b.orderBy(sort, desc ? 'desc' : 'asc')
                }
                return b
            },
            page,
            itemsPerPage,
            db,
        )
    }

    static async page<T extends typeof Model, B = number>(
        this: T,
        params: PageParams<B>,
        query: Query = qb => qb,
        db: Database = App.main.db,
    ): Promise<Page<InstanceType<T>, B>> {
        const records = await query(this.table(db))
            .where('id', '<', params.sinceId)
            .limit(params.limit)
        return {
            results: records.map((item: any) => this.fromJson(item)),
            since_id: params.sinceId,
        }
    }

    static async insert<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[] = {},
        db: Database = App.main.db,
    ): Promise<number> {
        const formattedData = this.formatJson(data)
        return await this.table(db).insert(formattedData)
    }

    static async insertAndFetch<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> = {},
        db: Database = App.main.db,
    ): Promise<InstanceType<T>> {
        const formattedData = this.formatJson(data)
        const id: number = await this.table(db).insert(formattedData)
        return await this.find(id) as InstanceType<T>
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
        return await this.find(id) as InstanceType<T>
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
}

export type ModelParams = 'id' | 'created_at' | 'updated_at' | 'parseJson' | 'project_id' | 'toJSON'
