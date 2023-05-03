import { FileStream } from '../storage/FileStream'
import { parse } from 'csv-parse'
import UserPatchJob from './UserPatchJob'
import ListStatsJob from '../lists/ListStatsJob'

export interface UserImport {
    project_id: number
    stream: FileStream
    list_id?: number
}

export const importUsers = async ({ project_id, stream, list_id }: UserImport) => {

    const parser = stream.file.pipe(parse({ columns: true, cast: true }))
    for await (const row of parser) {
        const { external_id, email, phone, timezone, ...data } = cleanRow(row)
        await UserPatchJob.from({
            project_id,
            user: {
                external_id,
                email,
                phone,
                timezone,
                data,
            },
            options: {
                join_list_id: list_id,
            },
        }).queue()
    }

    // Generate preliminary list count
    if (list_id) {
        await ListStatsJob.from(list_id, project_id).queue()
    }
}

const cleanRow = (row: Record<string, any>): Record<string, any> => {
    return Object.keys(row).reduce((acc, curr) => {
        acc[curr] = cleanCell(row[curr])
        return acc
    }, {} as Record<string, any>)
}

const cleanCell = (value: any) => {
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'false') return false
        if (value.toLowerCase() === 'true') return true
        if (value === 'NULL' || value == null || value === 'undefined' || value === '') return undefined
    }
    return value
}
