import * as dotenv from 'dotenv'
dotenv.config()

import { DatabaseConfig } from './database'
import { EmailDriver, SESConfig, SMTPConfig } from '../sender/Mailer'
import { QueueDriver, SQSConfig, MemoryConfig } from '../queue'

export interface Env {
    db: DatabaseConfig
    port: number
    mail: {
        driver: EmailDriver
        smtp?: SMTPConfig
        ses?: SESConfig
    }
    queue: {
        driver: QueueDriver
        sqs?: SQSConfig
        memory?: MemoryConfig
    }
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
    mail: {
        driver: process.env.MAIL_DRIVER as EmailDriver,
        smtp: {
            driver: 'smtp',
            host: process.env.MAIL_HOST!,
            port: parseInt(process.env.MAIL_PORT!),
            secure: process.env.MAIL_ENCRYPTED == 'true',
            auth: { 
                user: process.env.MAIL_USERNAME!, 
                pass: process.env.MAIL_PASSWORD!
            }
        },
        ses: {
            driver: 'ses',
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        }
    },
    queue: {
        driver: process.env.QUEUE_DRIVER as QueueDriver,
        sqs: {
            driver: 'sqs',
            queueUrl: process.env.AWS_SQS_QUEUE_URL!,
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        },
        memory: {
            driver: 'memory'
        }
    }
}

// Check to ensure ENV exists

export default env