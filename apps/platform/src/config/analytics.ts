import Analytics, { AnalyticsConfig } from '../events/Analytics'

export default (config: AnalyticsConfig) => {
    return new Analytics(config)
}
