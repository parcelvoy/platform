import { DriverConfig } from '../config/env'
import { ImageStream } from './ImageStream'
import { S3Config, S3StorageProvider } from './S3StorageProvider'
import { StorageProvider, StorageProviderName } from './StorageProvider'
import { extname } from 'path'
import { uuid } from '../utilities'

export type StorageConfig = S3Config
export interface StorageTypeConfig extends DriverConfig {
    driver: StorageProviderName
}

export interface ImageUpload {
    extension: string
}

export default class Storage {
    provider: StorageProvider

    constructor(config?: StorageConfig) {
        if (config?.driver === 's3') {
            this.provider = new S3StorageProvider(config)
        } else {
            throw new Error('A valid storage method must be defined!')
        }
    }

    async upload(image: ImageStream) {
        const key = uuid()
        const extension = extname(image.filename)
        const url = `${key}${extension}`

        await this.provider.upload({
            stream: image.file,
            url,
        })

        return {
            uuid: key,
            original_name: image.filename,
            extension,
        }
    }
}
