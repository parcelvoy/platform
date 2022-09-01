import * as dotenv from 'dotenv'
import { DatabaseConfig } from './database'

export interface Env {
    db: DatabaseConfig
    port: number
}

export interface DriverConfig {
    driver: string
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
        port: parseInt(process.env.PORT!),
    }
}

// mail: driver<EmailConfig>(process.env.MAIL_DRIVER, {
//     smtp: () => ({
//         host: process.env.MAIL_HOST!,
//         port: parseInt(process.env.MAIL_PORT!),
//         secure: process.env.MAIL_ENCRYPTED === 'true',
//         auth: {
//             user: process.env.MAIL_USERNAME!,
//             pass: process.env.MAIL_PASSWORD!,
//         },
//     }),
//     ses: () => ({
//         region: process.env.AWS_REGION!,
//         credentials: {
//             accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//             secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//         },
//     }),
// }),
// queue: driver<QueueConfig>(process.env.QUEUE_DRIVER, {
//     sqs: () => ({
//         queueUrl: process.env.AWS_SQS_QUEUE_URL!,
//         region: process.env.AWS_REGION!,
//         credentials: {
//             accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//             secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//         },
//     }),
// }),
// text: driver<TextConfig>(process.env.TEXT_MESSAGE_DRIVER, {
//     nexmo: () => ({
//         apiKey: process.env.NEXMO_API_KEY!,
//         apiSecret: process.env.NEXMO_API_SECRET!,
//     }),
//     plivo: () => ({
//         authId: process.env.PLIVO_AUTH_ID!,
//         authToken: process.env.PLIVO_AUTH_TOKEN!,
//     }),
//     twilio: () => ({
//         accountSid: process.env.TWILIO_ACCOUNT_SID!,
//         authToken: process.env.TWILIO_AUTH_TOKEN!,
//     }),
// }),
// webhook: driver<WebhookConfig>(process.env.WEBHOOK_DRIVER, {
//     local: () => ({}),
// }),
