import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { AnalyticsProvider, AnalyticsUserEvent } from './AnalyticsProvider'
import { createController } from '../ProviderService'
import { logger } from '../../config/logger'

type Convention = 'snake_case' | 'camel_case' | 'title_case'

interface MixpanelDataParams {
    project_token: string
    region?: string
    is_default: boolean
    event_name_convention: Convention
}

interface MixpanelProviderParams extends ProviderParams {
    data: MixpanelDataParams
}

export default class MixpanelAnalyticsProvider extends AnalyticsProvider {
    project_token!: string
    region?: string
    event_name_convention: Convention = 'snake_case'

    static namespace = 'mixpanel'
    static meta = {
        name: 'Mixpanel',
        url: 'https://mixpanel.com',
        icon: 'https://parcelvoy.com/providers/mixpanel.svg',
    }

    static schema = ProviderSchema<MixpanelProviderParams, MixpanelDataParams>('mixpanelAnalyticsProviderParams', {
        type: 'object',
        required: ['project_token', 'is_default'],
        properties: {
            project_token: { type: 'string' },
            region: { type: 'string', nullable: true, enum: ['api', 'api-eu'] },
            is_default: { type: 'boolean' },
            event_name_convention: { type: 'string', enum: ['snake_case', 'camel_case', 'title_case'] },
        },
    })

    async track(event: AnalyticsUserEvent) {

        const response = await fetch(`https://${this.region}.mixpanel.com/import`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${btoa(this.project_token + ':')}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify([{
                event: this.tranformEventName(event.name, this.event_name_convention),
                properties: {
                    ...event.data,
                    distinct_id: event.external_id,
                },
            }]),
        })

        if (!response.ok) {
            const responseBody = await response.json()
            logger.error('Mixpanel error', responseBody)
        }
    }

    static controllers(): ProviderControllers {
        return { admin: createController('analytics', this) }
    }
}
