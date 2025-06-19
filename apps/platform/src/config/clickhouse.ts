import { createClient, ClickHouseClient as ClickHouse } from '@clickhouse/client'

export { ClickHouse }

export interface ClickhouseConfig {
    url: string
    username: string
    password?: string
    database?: string
}

export default (config: ClickhouseConfig) => {
    return createClient({
        ...config,
        clickhouse_settings: {
            // Allows to insert serialized JS Dates (such as '2023-12-06T10:54:48.000Z')
            date_time_input_format: 'best_effort',
            output_format_json_quote_64bit_integers: 0, // Disable quoting of 64-bit integers
            async_insert: process.env.NODE_ENV === 'test' ? 0 : 1,
            wait_for_async_insert: 0,
            async_insert_deduplicate: 1,
            async_insert_busy_timeout_ms: 1000,
        },
    })
}

export const inferClickHouseType = (value: any): string => {
    if (value === null || value === undefined) {
        return 'Nullable(String)'
    }

    const type = typeof value

    if (type === 'string') {
        return 'String'
    }

    if (type === 'boolean') {
        return 'UInt8' // Booleans often stored as 0/1 in ClickHouse
    }

    if (type === 'number') {
        if (Number.isInteger(value)) {
            if (value >= 0) {
                if (value <= 255) return 'UInt8'
                if (value <= 65535) return 'UInt16'
                if (value <= 4294967295) return 'UInt32'
                return 'UInt64'
            } else {
                if (value >= -128 && value <= 127) return 'Int8'
                if (value >= -32768 && value <= 32767) return 'Int16'
                if (value >= -2147483648 && value <= 2147483647) return 'Int32'
                return 'Int64'
            }
        } else {
            return 'Float64' // ClickHouse supports Float32/64, but Float64 is safer for JS precision
        }
    }

    if (type === 'bigint') {
        return value >= 0n ? 'UInt64' : 'Int64'
    }

    if (Array.isArray(value)) {
        const elementTypes = new Set(value.map(inferClickHouseType))
        if (elementTypes.size === 1) {
            return `Array(${[...elementTypes][0]})`
        } else {
            return 'Array(String)' // fallback for mixed types
        }
    }

    if (type === 'object') {
        return 'JSON'
    }

    return 'String' // Fallback for unhandled cases
}
