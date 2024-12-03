import pino from 'pino'
import pretty from 'pino-pretty'
import ErrorHandler, { ErrorConfig } from '../error/ErrorHandler'

export const logger = pino({
    level: process.env.LOG_LEVEL || 'warn',
}, process.env.LOG_PRETTY_PRINT ? pretty({ colorize: true }) : undefined)

export default async (config: ErrorConfig) => {
    return new ErrorHandler(config)
}
