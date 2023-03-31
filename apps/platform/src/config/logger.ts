import pino from 'pino'
import pretty from 'pino-pretty'

// TODO: Check ENV and disable prettier for production
export const logger = pino({
    level: process.env.LOG_LEVEL || 'warn',
}, pretty({ colorize: true }))
