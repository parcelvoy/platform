import pino from 'pino'
import pretty from 'pino-pretty'
import ErrorHandler, { ErrorConfig } from '../error/ErrorHandler'

// TODO: Check ENV and disable prettier for production
export const logger = pino({
    level: process.env.LOG_LEVEL || 'warn',
}, pretty({ colorize: true }))

export default async (config: ErrorConfig) => {
    return new ErrorHandler(config)
}
