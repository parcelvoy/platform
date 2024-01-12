import { S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { PassThrough } from 'stream'
import { AWSConfig } from '../core/aws'
import { StorageTypeConfig } from './Storage'
import { ImageUploadTask, StorageProvider } from './StorageProvider'
import App from '../app'
import { combineURLs } from '../utilities'

export interface S3Config extends StorageTypeConfig, AWSConfig {
    driver: 's3'
    bucket: string
    endpoint: string
    forcePathStyle: boolean
}

export class S3StorageProvider implements StorageProvider {

    config: S3Config

    constructor(config: S3Config) {
        this.config = config
    }

    path(filename: string) {
        return filename
    }

    async upload(task: ImageUploadTask) {
        const pass = new PassThrough()
        const s3 = new S3(this.config)

        const promise = new Upload({
            client: s3,
            params: {
                Key: task.url,
                Body: pass,
                Bucket: this.config.bucket,
            },
        }).done()

        task.stream.pipe(pass)

        await promise
    }

    async delete(filename: string): Promise<void> {
        const s3 = new S3(this.config)
        await s3.deleteObject({
            Bucket: this.config.bucket,
            Key: filename,
        })
    }

    static url(path: string) {
        const config = App.main.env.storage as S3Config
        return config.endpoint && config.forcePathStyle
            ? combineURLs([config.endpoint, config.bucket, path])
            : combineURLs([`https://${config.bucket}.s3.amazonaws.com`, path])
    }
}
