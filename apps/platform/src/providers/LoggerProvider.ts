import Provider from '../providers/Provider'
import type { DriverConfig } from '../config/env'

export type LoggerProviderName = 'logger'
export class LoggerProvider extends Provider { }
export interface LoggerConfig extends DriverConfig {
    driver: LoggerProviderName
}
