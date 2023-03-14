
import { DriverConfig } from '../config/env'
import AnalyticsProvider, { AnalyticsProviderName, AnalyticsUserEvent } from './AnalyticsProvider'
import SegmentProvider, { SegmentConfig } from './SegmentProvider'

export type AnalyticsConfig = SegmentConfig

export interface AnalyticsTypeConfig extends DriverConfig {
    driver: AnalyticsProviderName
}

export default class Analytics {
    provider?: AnalyticsProvider

    constructor(config?: AnalyticsConfig) {
        if (config?.driver === 'segment') {
            this.provider = new SegmentProvider(config)
        }
    }

    async track(event: AnalyticsUserEvent) {
        await this.provider?.track(event)
    }
}
