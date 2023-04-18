import { FileStream } from '../storage/FileStream'
import { parse } from 'csv-parse'
import UserPatchJob from './UserPatchJob'
import App from '../app'

export interface UserImport {
    project_id: number
    stream: FileStream
    list_id?: number
}

export const importUsers = async ({ project_id, stream, list_id }: UserImport) => {

    const parser = stream.file.pipe(parse({ columns: true }))
    for await (const { external_id, email, phone, timezone, ...data } of parser) {
        await App.main.queue.enqueue(UserPatchJob.from({
            project_id,
            user: {
                external_id,
                email,
                phone: cleanNulls(timezone),
                timezone: cleanNulls(timezone),
                data,
            },
            options: {
                join_list_id: list_id,
            },
        }))
    }
}

const cleanNulls = (value?: string, emptyIsNull = true) => {
    if (value === 'NULL' || value == null) return undefined
    if (value === '' && emptyIsNull) return undefined
    return value
}
