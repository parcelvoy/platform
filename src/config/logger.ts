import pino from 'pino'
import pretty from 'pino-pretty'
import { DriverConfig } from './env'

export type LoggerDriver = 'logger'
export interface LoggerConfig extends DriverConfig {
    driver: 'logger'
}

// TODO: Check ENV and disable prettier for production
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
}, pretty({ colorize: true }))
