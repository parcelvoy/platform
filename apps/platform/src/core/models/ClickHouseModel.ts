import App from '../../app'
import { PageParams } from '../searchParams'
import { RawModel } from './RawModel'

export const clickhouseInsert = async <T extends typeof RawModel>(
    model: T,
    data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[] = {},
    clickhouse = App.main.clickhouse,
) => {
    const formattedData = Array.isArray(data)
        ? data.map(o => model.formatJson(o))
        : [model.formatJson(data)]
    return await clickhouse.insert({
        table: model.tableName,
        values: formattedData,
        format: 'JSONEachRow',
    })
}

export const clickhouseQuery = async <T extends typeof RawModel>(
    model: T,
    query: string,
    params: any = {},
    clickhouse = App.main.clickhouse,
) => {
    return await clickhouse.query({
        query,
        query_params: params,
        format: 'JSONEachRow',
    })
}

export const clickhouseAll = async <T extends typeof RawModel>(
    model: T,
    query: string,
    params: any = {},
    clickhouse = App.main.clickhouse,
) => {
    const result = await clickhouse.query({
        query,
        query_params: params,
        format: 'JSONEachRow',
    })
    const json = await result.json()
    return json.map((item: any) => model.fromJson(item))
}

export const clickhouseDelete = async <T extends typeof RawModel>(
    model: T,
    where: string,
    params: any = {},
    clickhouse = App.main.clickhouse,
) => {
    return await clickhouse.exec({
        query: `DELETE FROM ${model.tableName} WHERE (${where})`,
        query_params: params,
    })
}

export const clickhouseSearch = async <T extends typeof RawModel>(
    model: T,
    query: string,
    params: PageParams,
    clickhouse = App.main.clickhouse,
) => {
    const limit = params.limit ?? 25
    const offset = parseInt(params.cursor ?? '0') ?? 0
    const result = await clickhouse.query({
        query: `${query} LIMIT {limit: UInt32} OFFSET {offset: UInt32}`,
        query_params: {
            limit,
            offset,
        },
        format: 'JSONEachRow',
    })
    const results = await result.json()
    return {
        results: results.map((item: any) => model.fromJson(item)),
        limit,
        prevCursor: offset > 0 ? `${Math.max(0, offset - limit)}` : undefined,
        nextCursor: results.length < limit ? undefined : `${offset + limit}`,
    }
}

export class ClickHouseModel extends RawModel {

    static async insert<T extends typeof RawModel>(
        this: T,
        data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[] = {},
        clickhouse = App.main.clickhouse,
    ) {
        return clickhouseInsert(this, data, clickhouse)
    }

    static async upsert<T extends typeof RawModel>(
        this: T,
        newRecord: Partial<InstanceType<T>>,
        oldRecord?: Partial<InstanceType<T>>,
        clickhouse = App.main.clickhouse,
    ) {
        const values = []
        if (oldRecord) {
            values.push({
                ...oldRecord,
                sign: -1,
            })
        }
        values.push({
            ...newRecord,
            sign: 1,
        })
        return clickhouseInsert(this, values, clickhouse)
    }

    static async all<T extends typeof RawModel>(
        this: T,
        query: string,
        params: any = {},
        clickhouse = App.main.clickhouse,
    ) {
        return clickhouseAll(this, query, params, clickhouse)
    }

    static async query<T extends typeof RawModel>(
        this: T,
        query: string,
        params: any = {},
        clickhouse = App.main.clickhouse,
    ) {
        return clickhouseQuery(this, query, params, clickhouse)
    }

    static async search<T extends typeof RawModel>(
        this: T,
        query: string,
        params: PageParams,
        clickhouse = App.main.clickhouse,
    ) {
        return clickhouseSearch(this, query, params, clickhouse)
    }

    static async exists<T extends typeof RawModel>(
        this: T,
        where: string,
        params: any = {},
        clickhouse = App.main.clickhouse,
    ): Promise<boolean> {
        const result = await clickhouse.query({
            query: `SELECT count() AS count FROM ${this.tableName} WHERE (${where}) LIMIT 1`,
            query_params: params,
            format: 'JSONEachRow',
        })
        const json = await result.json() as { count: number }[]
        return json[0].count > 0
    }

    static async delete<T extends typeof RawModel>(
        this: T,
        where: string,
        params: any = {},
        clickhouse = App.main.clickhouse,
    ) {
        return clickhouseDelete(this, where, params, clickhouse)
    }
}
