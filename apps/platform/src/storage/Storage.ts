import { DriverConfig } from '../config/env'
import { FileStream } from './FileStream'
import Image from './Image'
import { S3Config, S3StorageProvider } from './S3StorageProvider'
import { ImageUploadTask, StorageProvider, StorageProviderName } from './StorageProvider'
import path from 'path'
import { combineURLs, uuid } from '../utilities'
import { InternalError } from '../core/errors'
import StorageError from './StorageError'
import App from '../app'
import { LocalConfig, LocalStorageProvider } from './LocalStorageProvider'

export type StorageConfig = S3Config | LocalConfig
export interface StorageTypeConfig extends DriverConfig {
    driver: StorageProviderName
    baseUrl: string
}

export interface ImageUpload {
    extension: string
}

export default class Storage {
    provider: StorageProvider

    constructor(config?: StorageConfig) {
        if (config?.driver === 's3') {
            this.provider = new S3StorageProvider(config)
        } else if (config?.driver === 'local') {
            this.provider = new LocalStorageProvider()
        } else {
            throw new InternalError(StorageError.UndefinedStorageMethod)
        }
    }

    async save(image: FileStream): Promise<Partial<Image>> {
        const key = uuid()
        const originalPath = path.parse(image.metadata.fileName)
        const extension = originalPath.ext
        const fileName = originalPath.name
        const url = this.provider.path(`${key}${extension}`)

        await this.upload({
            stream: image.file,
            url,
        })

        return {
            uuid: key,
            original_name: fileName,
            extension,
            file_size: image.metadata.size,
        }
    }

    async upload(task: ImageUploadTask) {
        await this.provider.upload(task)
    }

    url(path: string): string {
        return combineURLs([App.main.env.storage.baseUrl, path])
    }
}
