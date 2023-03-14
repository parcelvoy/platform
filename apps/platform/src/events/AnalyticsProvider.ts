import { UserEventParams } from './UserEvent'

export type AnalyticsProviderName = 'segment' | 'mixpanel'

export type AnalyticsUserEvent = UserEventParams & { external_id: string }

export default interface AnalyticsProvider {
    track(event: AnalyticsUserEvent): Promise<void>
}
