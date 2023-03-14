import Router from '@koa/router'
import { Analytics as Segment } from '@segment/analytics-node'
import { ProviderParams, ProviderSchema } from '../Provider'
import { AnalyticsTypeConfig } from './Analytics'
import { AnalyticsProvider, AnalyticsUserEvent } from './AnalyticsProvider'
import { createController } from '../ProviderService'

export interface SegmentConfig extends AnalyticsTypeConfig {
    driver: 'segment'
    writeKey: string
}

interface SegmentDataParams {
    write_key: string
}

interface SegmentProviderParams extends ProviderParams {
    data: SegmentDataParams
}

export default class SegmentAnalyticsProvider extends AnalyticsProvider {
    write_key!: string

    static namespace = 'segment'
    static meta = {
        name: 'Segment',
        url: 'https://segment.com',
        icon: 'https://parcelvoy.com/images/segment.svg',
    }

    static schema = ProviderSchema<SegmentProviderParams, SegmentDataParams>('segmentAnalyticsProviderParams', {
        type: 'object',
        required: ['write_key'],
        properties: {
            write_key: { type: 'string' },
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
            event: event.name,
            properties: event.data,
        })
    }

    static controllers(): Router {
        return createController('analytics', this.namespace, this.schema)
    }
}
