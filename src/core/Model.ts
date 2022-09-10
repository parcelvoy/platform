import App from '../app'
import { Database } from '../config/database'
import { pascalToSnakeCase, pluralize } from '../utilities'

export const raw = (raw: Database.Value, db: Database = App.main.db) => {
    return db.raw(raw)
}

type Where = (builder: Database.QueryBuilder<any>) => Database.QueryBuilder<any>

export interface Page<T, B = number> {
    results: T[]
    since_id: B
}

export interface PageParams<B> {
    sinceId: B
    limit: number
    where: Where
}

export default class Model {

    id!: number
    created_at: Date = new Date()
    updated_at: Date = new Date()

    static jsonAttributes: string[] = []

    static fromJson<T extends typeof Model>(this: T, json: Partial<InstanceType<T>>): InstanceType<T> {
        const model = new this()
        model.parseJson(json)
        return model as InstanceType<T>
    }

    parseJson(json: any) {
        Object.assign(this, json)
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
        where: Where,
        db: Database = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        const record = await where(this.table(db)).first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async find<T extends typeof Model>(
        this: T,
        id: number | undefined,
        where: Where = (qb) => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        if (!id) return undefined
        const record = await where(this.table(db))
            .where({ id })
            .first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async all<T extends typeof Model>(
        this: T,
        where: Where = qb => qb,
        db: Database = App.main.db,
    ): Promise<InstanceType<T>[]> {
        const records = await where(this.table(db))
        return records.map((item: any) => this.fromJson(item))
    }

    static async page<T extends typeof Model, B = number>(
        this: T,
        params: PageParams<B>,
        where: Where = qb => qb,
        db: Database = App.main.db,
    ): Promise<Page<InstanceType<T>, B>> {
        const records = await where(this.table(db))
            .where('id', '<', params.sinceId)
            .limit(params.limit)
        return {
            results: records.map((item: any) => this.fromJson(item)),
            since_id: params.sinceId,
        }
    }

    static async insert<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> = {},
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
        console.log(formattedData)
        await this.table(db).where('id', id).update(formattedData)
        return await this.find(id) as InstanceType<T>
    }

    static async delete<T extends typeof Model>(
        this: T,
        where: Where,
        db: Database = App.main.db,
    ): Promise<number> {
        return await where(this.table(db)).delete()
    }

    static get tableName(): string {
        return pluralize(pascalToSnakeCase(this.name))
    }

    static table(db: Database = App.main.db): Database.QueryBuilder<any> {
        return db(this.tableName)
    }

    static raw = raw
}

export type ModelParams = 'id' | 'created_at' | 'updated_at' | 'parseJson'
