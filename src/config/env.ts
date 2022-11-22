import * as dotenv from 'dotenv'
import { StorageConfig } from '../storage/Storage'
import { QueueConfig } from '../queue/Queue'
import { DatabaseConfig } from './database'
import { AuthConfig } from '../auth/Auth'

export interface Env {
    db: DatabaseConfig
    queue: QueueConfig
    storage: StorageConfig
    baseUrl: string
    port: number
    secret: string
    auth: AuthConfig
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
        storage: {
            baseUrl: process.env.STORAGE_BASE_URL!,
            ...driver<Omit<StorageConfig, 'baseUrl'>>(process.env.STORAGE_DRIVER, {
                s3: () => ({
                    bucket: process.env.AWS_S3_BUCKET!,
                    region: process.env.AWS_REGION!,
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                    },
                }),
            }),
        },
        baseUrl: process.env.BASE_URL!,
        port: parseInt(process.env.PORT!),
        secret: process.env.APP_SECRET!,
        auth: driver<AuthConfig>(process.env.AUTH_DRIVER, {
            saml: () => ({
                tokenLife: 3600,
                callbackUrl: process.env.AUTH_SAML_CALLBACK_URL,
                entryPoint: process.env.AUTH_SAML_ENTRY_POINT_URL,
                issuer: process.env.AUTH_SAML_ISSUER,
                cert: process.env.AUTH_SAML_CERT,
                wantAuthnResponseSigned: process.env.AUTH_SAML_IS_AUTHN_SIGNED === 'true',
            }),
            openid: () => ({
                tokenLife: 3600,
                issuerUrl: process.env.AUTH_OPENID_ISSUER_URL,
                clientId: process.env.AUTH_OPENID_CLIENT_ID,
                clientSecret: process.env.AUTH_OPENID_CLIENT_SECRET,
                redirectUri: process.env.AUTH_OPENID_REDIRECT_URI,
                domainWhitelist: (process.env.AUTH_OPENID_DOMAIN_WHITELIST || '').split(','),
            }),
            logger: () => ({
                tokenLife: 3600,
            }),
        }),
    }
}
