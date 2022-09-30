import { Stream } from 'stream'

export type StorageProviderName = 's3'

export interface ImageUploadTask {
    stream: Stream
    url: string
}

export interface StorageProvider {
    upload(task: ImageUploadTask): Promise<void>
    delete(filename: string): Promise<void>
}
