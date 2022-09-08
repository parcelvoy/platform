import * as dotenv from 'dotenv'
import { DatabaseConfig } from './database'

export interface Env {
    db: DatabaseConfig
    port: number
    secret: string
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
        secret: process.env.APP_SECRET!,
    }
}
