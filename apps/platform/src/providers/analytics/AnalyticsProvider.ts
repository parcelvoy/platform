import { camelcase, titleize } from '../../render/Helpers/String'
import { UserEventParams } from '../../users/UserEvent'
import { snakeCase } from '../../utilities'
import Provider, { ProviderGroup } from '../Provider'

export type AnalyticsProviderName = 'segment' | 'mixpanel' | 'posthog'

export type AnalyticsUserEvent = UserEventParams & {
    external_id: string
    anonymous_id?: string
}

export type Convention = 'snake_case' | 'camel_case' | 'title_case'

export abstract class AnalyticsProvider extends Provider {
    abstract track(event: AnalyticsUserEvent): Promise<void>

    static group = 'analytics' as ProviderGroup

    tranformEventName(event: string, convention: Convention) {
        switch (convention) {
        case 'camel_case': return camelcase(event)
        case 'snake_case': return snakeCase(event)
        case 'title_case': return titleize(event)
        }
    }
}
