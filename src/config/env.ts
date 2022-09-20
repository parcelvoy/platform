import * as dotenv from 'dotenv'
import { StorageConfig } from '../media/Storage'
import { QueueConfig } from '../queue/Queue'
import { DatabaseConfig } from './database'

export interface Env {
    db: DatabaseConfig
    queue: QueueConfig
    storage: StorageConfig
    port: number
    secret: string
}

export interface DriverConfig {
    driver: string
}

type DriverLoaders<T> = Record<string, () => T>
const driver = <T extends DriverConfig>(driver: string | undefined, loaders: DriverLoaders<Omit<T, 'driver'>>) => {
    const driverKey = driver ?? 'logger'
    const loadedDriver = loaders[driverKey] ? loaders[driverKey]() : {}
    return { ...loadedDriver, driver: driverKey } as T
}

type EnvType = 'production' | 'test'
export default (type?: EnvType): Env => {
    dotenv.config({ path: `.env${type === 'test' ? '.test' : ''}` })

    return {
        db: {
            client: process.env.DB_CLIENT as 'mysql2' | 'postgres',
            connection: {
                host: process.env.DB_HOST!,
                user: process.env.DB_USERNAME!,
                password: process.env.DB_PASSWORD!,
                port: parseInt(process.env.DB_PORT!),
                database: process.env.DB_DATABASE!,
            },
        },
        queue: driver<QueueConfig>(process.env.QUEUE_DRIVER, {
            sqs: () => ({
                queueUrl: process.env.AWS_SQS_QUEUE_URL!,
                region: process.env.AWS_REGION!,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                },
            }),
        }),
        storage: driver<StorageConfig>(process.env.STORAGE_DRIVER, {
            s3: () => ({
                bucket: process.env.AWS_S3_BUCKET!,
                region: process.env.AWS_REGION!,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                },
            }),
        }),
        port: parseInt(process.env.PORT!),
        secret: process.env.APP_SECRET!,
    }
}
