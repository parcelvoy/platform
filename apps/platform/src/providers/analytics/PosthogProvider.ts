import { PostHog } from 'posthog-node'
import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { AnalyticsProvider, AnalyticsUserEvent, Convention } from './AnalyticsProvider'
import { createController } from '../ProviderService'

interface PostHogDataParams {
    api_key: string
    host?: string
    is_default: boolean
    event_name_convention: Convention
}

interface PostHogProviderParams extends ProviderParams {
    data: PostHogDataParams
}

export default class PostHogAnalyticsProvider extends AnalyticsProvider {
    api_key!: string
    host?: string
    event_name_convention: Convention = 'snake_case'

    static namespace = 'posthog'
    static meta = {
        name: 'PostHog',
        url: 'https://posthog.com',
        icon: 'https://parcelvoy.com/providers/posthog.svg',
    }

    static schema = ProviderSchema<PostHogProviderParams, PostHogDataParams>('postHogAnalyticsProviderParams', {
        type: 'object',
        required: ['api_key', 'is_default'],
        properties: {
            api_key: { type: 'string' },
            host: { type: 'string', nullable: true },
            is_default: { type: 'boolean' },
            event_name_convention: { type: 'string', enum: ['snake_case', 'camel_case', 'title_case'] },
        },
    })

    client!: PostHog

    async track(event: AnalyticsUserEvent) {

        // If PostHog has not been initialized yet, start it
        if (!this.client) {
            this.client = new PostHog(this.api_key, {
                host: this.host,
            })
        }

        this.client.capture({
            distinctId: event.external_id,
            event: this.tranformEventName(event.name, this.event_name_convention),
            properties: event.data,
        })
    }

    static controllers(): ProviderControllers {
        return { admin: createController('analytics', this) }
    }
}
