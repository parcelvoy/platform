import { S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { PassThrough } from 'stream'
import { AWSConfig } from '../core/aws'
import { StorageTypeConfig } from './Storage'
import { ImageUploadTask, StorageProvider } from './StorageProvider'

export interface S3Config extends StorageTypeConfig, AWSConfig {
    bucket: string
}

export class S3StorageProvider implements StorageProvider {

    config: S3Config

    constructor(config: S3Config) {
        this.config = config
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

    async url(filename: string) {
        // TODO: Add the S3 bucket base URL
        return filename
    }

    async delete(): Promise<void> {
        // TODO: Allow for deleting files
        throw new Error()
    }
}
