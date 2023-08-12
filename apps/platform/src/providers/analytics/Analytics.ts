import { DriverConfig } from '../../config/env'
import { AnalyticsProvider, AnalyticsProviderName, AnalyticsUserEvent } from './AnalyticsProvider'

export interface AnalyticsTypeConfig extends DriverConfig {
    driver: AnalyticsProviderName
}

export default class Analytics {
    readonly provider?: AnalyticsProvider
    constructor(provider?: AnalyticsProvider) {
        this.provider = provider
    }

    async track(event: AnalyticsUserEvent) {
        await this.provider?.track(event)
    }
}
