import { Stream } from 'stream'

export type StorageProviderName = 's3' | 'local'

export interface ImageUploadTask {
    stream: Stream
    url: string
}

export interface StorageProvider {
    path(filename: string): string
    upload(task: ImageUploadTask): Promise<void>
    delete(filename: string): Promise<void>
}
