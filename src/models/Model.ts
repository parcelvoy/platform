import { Knex } from 'knex'
import App from '../app'
import { pascalToSnakeCase, pluralize } from '../utilities'

export default class Model {

    id!: number
    created_at: Date = new Date()
    updated_at: Date = new Date()

    static fromJson<T extends typeof Model>(this: T, json: Partial<InstanceType<T>>): InstanceType<T> {
        const model = new this()
        model.parseJson(json)
        return model as InstanceType<T>
    }

    parseJson(json: any) {
        Object.assign(this, json)
    }

    static query<T extends typeof Model>(this: T, db: Knex = App.main.db): Knex.QueryBuilder<InstanceType<T>> {
        return this.table(db)
    }

    static async first<T extends typeof Model>(
        this: T,
        where: (builder: Knex.QueryBuilder<any>) => Knex.QueryBuilder<any>,
        db: Knex = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        const record = await where(this.table(db)).first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async find<T extends typeof Model>(
        this: T,
        id: number | undefined,
        db: Knex = App.main.db,
    ): Promise<InstanceType<T> | undefined> {
        if (!id) return undefined
        const record = await this.table(db).where({ id }).first()
        if (!record) return undefined
        return this.fromJson(record)
    }

    static async all<T extends typeof Model>(
        this: T,
        where: (builder: Knex.QueryBuilder<any>) => Knex.QueryBuilder<any>,
        db: Knex = App.main.db,
    ): Promise<InstanceType<T>[]> {
        const records = await where(this.table(db))
        return records.map((item: any) => this.fromJson(item))
    }

    static async insert<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> = {},
        db: Knex = App.main.db,
    ): Promise<number> {
        return await this.table(db).insert(data)
    }

    static async insertAndFetch<T extends typeof Model>(
        this: T,
        data: Partial<InstanceType<T>> = {},
        db: Knex = App.main.db,
    ): Promise<InstanceType<T>> {
        const id: number = await this.table(db).insert(data)
        return await this.find(id) as InstanceType<T>
    }

    static async update<T extends typeof Model>(
        this: T,
        where: (builder: Knex.QueryBuilder<any>) => Knex.QueryBuilder<any>,
        data: any = {},
        db: Knex = App.main.db,
    ): Promise<number> {
        return await where(this.table(db)).update(data)
    }

    static async delete<T extends typeof Model>(
        this: T,
        where: (builder: Knex.QueryBuilder<any>) => Knex.QueryBuilder<any>,
        db: Knex = App.main.db,
    ): Promise<number> {
        return await where(this.table(db)).delete()
    }

    static get tableName(): string {
        return pluralize(pascalToSnakeCase(this.name))
    }

    private static table(db: Knex = App.main.db): Knex.QueryBuilder<any> {
        return db(this.tableName)
    }
}

export type ModelParams = 'id' | 'created_at' | 'updated_at' | 'parseJson'
