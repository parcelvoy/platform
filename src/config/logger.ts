import pino from 'pino'
import pretty from 'pino-pretty'
import { Provider } from '../core/Provider'

export type LoggerProviderName = 'logger'
export class LoggerProvider extends Provider { }

// TODO: Check ENV and disable prettier for production
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
}, pretty({ colorize: true }))
