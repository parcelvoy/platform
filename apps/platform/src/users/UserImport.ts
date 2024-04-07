import { FileStream } from '../storage/FileStream'
import { parse, Options } from 'csv-parse'
import UserPatchJob from './UserPatchJob'
import ListStatsJob from '../lists/ListStatsJob'
import { RequestError } from '../core/errors'
import App from '../app'
import { Chunker } from '../utilities'

export interface UserImport {
    project_id: number
    stream: FileStream
    list_id?: number
}

export const importUsers = async ({ project_id, stream, list_id }: UserImport) => {

    const options: Options = {
        columns: true,
        cast: true,
        skip_empty_lines: true,
        bom: true,
    }

    const chunker = new Chunker<UserPatchJob>(
        items => App.main.queue.enqueueBatch(items),
        App.main.queue.batchSize,
    )
    const parser = stream.file.pipe(parse(options))
    for await (const row of parser) {
        const { external_id, email, phone, timezone, locale, created_at, ...data } = cleanRow(row)
        if (!external_id) throw new RequestError('Every upload must contain a column `external_id` which contains the identifier for that user.')
        await chunker.add(UserPatchJob.from({
            project_id,
            user: {
                external_id: `${external_id}`,
                email,
                phone,
                timezone,
                locale,
                data,
                created_at,
            },
            options: {
                join_list_id: list_id,
            },
        }))
    }
    await chunker.flush()

    // Generate preliminary list count
    if (list_id) {
        await ListStatsJob.from(list_id, project_id, true).delay(2000).queue()
    }
}

const cleanRow = (row: Record<string, any>): Record<string, any> => {
    return Object.keys(row).reduce((acc, curr) => {
        acc[curr] = cleanCell(row[curr], curr)
        return acc
    }, {} as Record<string, any>)
}

const cleanCell = (value: any, key: string) => {
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'false') return false
        if (value.toLowerCase() === 'true') return true
        if (value === 'NULL' || value == null || value === 'undefined' || value === '') return undefined
        if (key.includes('_at')) return new Date(value)
    }
    return value
}
