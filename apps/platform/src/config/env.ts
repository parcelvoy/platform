import * as dotenv from 'dotenv'
import { logger } from './logger'
import type { StorageConfig } from '../storage/Storage'
import type { QueueConfig } from '../queue/Queue'
import type { DatabaseConfig } from './database'
import type { AuthConfig, AuthProviderName } from '../auth/Auth'
import type { ErrorConfig } from '../error/ErrorHandler'
import { RedisConfig } from './redis'
import { isValidUrl } from '../utilities'

export type Runner = 'api' | 'worker'
export interface Env {
    runners: Runner[]
    config: {
        monoDocker: boolean
        multiOrg: boolean
    }
    db: DatabaseConfig
    queue: QueueConfig
    storage: StorageConfig
    baseUrl: string
    apiBaseUrl: string
    port: number
    secret: string
    auth: AuthConfig
    error: ErrorConfig
    redis: RedisConfig
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

// 24 hours?
const defaultTokenLife = 24 * 60 * 60

type EnvType = 'production' | 'test'
export default (type?: EnvType): Env => {
    dotenv.config({ path: `.env${type === 'test' ? '.test' : ''}` })

    const port = parseInt(process.env.PORT ?? '3000')
    const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`
    const apiBaseUrl = process.env.API_BASE_URL ?? `${baseUrl}/api`

    // Validate required env vars
    if (!isValidUrl(baseUrl)) {
        logger.error(`parcelvoy:env Please ensure BASE_URL is a valid non relative URL. Current value is "${baseUrl}"`)
    }

    return {
        runners: (process.env.RUNNER ?? 'api,worker').split(',') as Runner[],
        config: {
            monoDocker: (process.env.MONO ?? 'false') === 'true',
            multiOrg: (process.env.MULTI_ORG ?? 'false') === 'true',
        },
        db: {
            host: process.env.DB_HOST!,
            user: process.env.DB_USERNAME!,
            password: process.env.DB_PASSWORD!,
            port: parseInt(process.env.DB_PORT!),
            database: process.env.DB_DATABASE!,
            migrationPaths: process.env.DB_MIGRATION_PATHS?.split(',') ?? [],
        },
        redis: {
            host: process.env.REDIS_HOST!,
            port: parseInt(process.env.REDIS_PORT!),
            tls: process.env.REDIS_TLS === 'true',
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
            redis: () => ({
                host: process.env.REDIS_HOST!,
                port: parseInt(process.env.REDIS_PORT!),
                tls: process.env.REDIS_TLS === 'true',
                concurrency: parseInt(process.env.REDIS_CONCURRENCY ?? '10'),
            }),
        }),
        storage: driver<StorageConfig>(process.env.STORAGE_DRIVER ?? 'local', {
            s3: () => ({
                baseUrl: process.env.STORAGE_BASE_URL,
                bucket: process.env.STORAGE_S3_BUCKET ?? process.env.AWS_S3_BUCKET!,
                region: process.env.AWS_REGION ?? 'us-east-1',
                endpoint: process.env.STORAGE_S3_ENDPOINT,
                forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE !== 'false',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                },
            }),
            local: () => ({
                baseUrl: process.env.STORAGE_BASE_URL,
            }),
        }),
        baseUrl,
        apiBaseUrl,
        port,
        secret: process.env.APP_SECRET!,
        auth: {
            driver: (process.env.AUTH_DRIVER?.split(',') ?? []) as AuthProviderName[],
            tokenLife: defaultTokenLife,
            basic: {
                driver: 'basic',
                name: process.env.AUTH_BASIC_NAME!,
                email: process.env.AUTH_BASIC_EMAIL!,
                password: process.env.AUTH_BASIC_PASSWORD!,
            },
            email: {
                driver: 'email',
                from: process.env.AUTH_EMAIL_FROM!,
                host: process.env.AUTH_EMAIL_SMTP_HOST!,
                port: parseInt(process.env.AUTH_EMAIL_SMTP_PORT!),
                secure: process.env.AUTH_EMAIL_SMTP_SECURE === 'true',
                auth: {
                    user: process.env.AUTH_EMAIL_SMTP_USERNAME!,
                    pass: process.env.AUTH_EMAIL_SMTP_PASSWORD!,
                },
            },
            saml: {
                driver: 'saml',
                name: process.env.AUTH_SAML_NAME!,
                callbackUrl: `${apiBaseUrl}/auth/login/saml/callback`,
                entryPoint: process.env.AUTH_SAML_ENTRY_POINT_URL!,
                issuer: process.env.AUTH_SAML_ISSUER!,
                cert: process.env.AUTH_SAML_CERT!,
                wantAuthnResponseSigned: process.env.AUTH_SAML_IS_AUTHN_SIGNED === 'true',
            },
            openid: {
                driver: 'openid',
                name: process.env.AUTH_OPENID_NAME!,
                issuerUrl: process.env.AUTH_OPENID_ISSUER_URL!,
                clientId: process.env.AUTH_OPENID_CLIENT_ID!,
                clientSecret: process.env.AUTH_OPENID_CLIENT_SECRET!,
                redirectUri: `${apiBaseUrl}/auth/login/openid/callback`,
                domain: process.env.AUTH_OPENID_DOMAIN!,
            },
            google: {
                driver: 'google',
                name: process.env.AUTH_GOOGLE_NAME!,
                clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
                clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
                redirectUri: `${apiBaseUrl}/auth/login/google/callback`,
            },
            multi: {
                driver: 'multi',
                name: process.env.AUTH_MULTI_NAME!,
            },
        },
        error: driver<ErrorConfig>(process.env.ERROR_DRIVER, {
            bugsnag: () => ({
                apiKey: process.env.ERROR_BUGSNAG_API_KEY,
            }),
            sentry: () => ({
                dsn: process.env.ERROR_SENTRY_DSN,
            }),
        }),
    }
}
