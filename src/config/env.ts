import * as dotenv from 'dotenv'
dotenv.config()

import { DatabaseConfig, Knex } from './database'
import { EmailConfig } from '../sender/Mailer'
import { QueueConfig } from '../queue/Queue'

export interface BootEnv {
    db: DatabaseConfig
    port: number
}

export interface Env extends BootEnv {
    mailer: EmailConfig
    queue: QueueConfig
}

const env: BootEnv = {
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
    port: parseInt(process.env.PORT!)
}

export const loadRemoteEnv = async (db: Knex): Promise<Env> => {
    const response = { }
    //TODO: Pull env from database somewhere
    // return { ...env, ...response }
    return { ...env } as unknown as Env
}

// Check to ensure ENV exists

export default env