import { Analytics as Segment } from '@segment/analytics-node'
import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { AnalyticsProvider, AnalyticsUserEvent, Convention } from './AnalyticsProvider'
import { createController } from '../ProviderService'

interface SegmentDataParams {
    write_key: string
    is_default: boolean
    event_name_convention: Convention
}

interface SegmentProviderParams extends ProviderParams {
    data: SegmentDataParams
}

export default class SegmentAnalyticsProvider extends AnalyticsProvider {
    write_key!: string
    event_name_convention: Convention = 'snake_case'

    static namespace = 'segment'
    static meta = {
        name: 'Segment',
        url: 'https://segment.com',
        icon: 'https://parcelvoy.com/providers/segment.svg',
    }

    static schema = ProviderSchema<SegmentProviderParams, SegmentDataParams>('segmentAnalyticsProviderParams', {
        type: 'object',
        required: ['write_key'],
        properties: {
            write_key: { type: 'string' },
            is_default: { type: 'boolean' },
            event_name_convention: { type: 'string', enum: ['snake_case', 'camel_case', 'title_case'] },
        },
    })

    segment!: Segment

    async track(event: AnalyticsUserEvent) {

        // If Segment has not been initialized yet, start it
        if (!this.segment) {
            this.segment = new Segment({ writeKey: this.write_key })
        }

        this.segment.track({
            userId: event.external_id,
            anonymousId: event.anonymous_id,
            event: this.tranformEventName(event.name, this.event_name_convention),
            properties: event.data,
        })
    }

    static controllers(): ProviderControllers {
        return { admin: createController('analytics', this) }
    }
}
