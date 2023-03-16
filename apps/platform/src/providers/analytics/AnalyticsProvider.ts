import { UserEventParams } from '../../users/UserEvent'
import Provider from '../Provider'

export type AnalyticsProviderName = 'segment'

export type AnalyticsUserEvent = UserEventParams & { external_id: string }

export abstract class AnalyticsProvider extends Provider {
    abstract track(event: AnalyticsUserEvent): Promise<void>
}
