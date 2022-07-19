import * as dotenv from 'dotenv'
import { DatabaseConfig } from './database'
import { EmailConfig } from '../sender/email/EmailSender'
import { QueueConfig } from '../queue'
import { TextConfig } from '../sender/text/TextSender'
import { WebhookConfig } from '../sender/webhook/Webhook'

// Load up config variables
dotenv.config()

export interface Env {
    db: DatabaseConfig
    port: number
    mail: EmailConfig
    queue: QueueConfig
    text: TextConfig
    webhook: WebhookConfig
}

export interface DriverConfig {
    driver: string
}

type DriverLoaders<T> = Record<string, () => T>
const driver = <T extends DriverConfig>(driver: string | undefined, loaders: DriverLoaders<Omit<T, 'driver'>>) => {
    const driverKey = driver ?? 'logger'
    const loadedDriver = loaders[driverKey] ? loaders[driverKey]() : {}

    // TODO: Find solution to force casting
    // Using because it felt duplicative to have driver
    // in both the key and object. Also lets you not have
    // to define types that don't have params
    return { ...loadedDriver, driver: driverKey } as T
}

const env: Env = {
    db: {
        client: process.env.DB_CLIENT as 'mysql2' | 'postgres',
        connection: {
            host: process.env.DB_HOST!,
            user: process.env.DB_USERNAME!,
            password: process.env.DB_PASSWORD!,
            port: parseInt(process.env.DB_PORT!),
            database: process.env.DB_DATABASE!
        }
    },
    port: parseInt(process.env.PORT!),
    mail: driver<EmailConfig>(process.env.MAIL_DRIVER, {
        smtp: () => ({
            host: process.env.MAIL_HOST!,
            port: parseInt(process.env.MAIL_PORT!),
            secure: process.env.MAIL_ENCRYPTED === 'true',
            auth: {
                user: process.env.MAIL_USERNAME!,
                pass: process.env.MAIL_PASSWORD!
            }
        }),
        ses: () => ({
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        })
    }),
    queue: driver<QueueConfig>(process.env.QUEUE_DRIVER, {
        sqs: () => ({
            queueUrl: process.env.AWS_SQS_QUEUE_URL!,
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        })
    }),
    text: driver<TextConfig>(process.env.TEXT_MESSAGE_DRIVER, {
        nexmo: () => ({
            apiKey: process.env.NEXMO_API_KEY!,
            apiSecret: process.env.NEXMO_API_SECRET!
        }),
        plivo: () => ({
            authId: process.env.PLIVO_AUTH_ID!,
            authToken: process.env.PLIVO_AUTH_TOKEN!
        }),
        twilio: () => ({
            accountSid: process.env.TWILIO_ACCOUNT_SID!,
            authToken: process.env.TWILIO_AUTH_TOKEN!
        })
    }),
    webhook: driver<WebhookConfig>(process.env.WEBHOOK_DRIVER, {
        local: () => ({})
    })
}

export default env
