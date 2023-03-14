import { Analytics as Segment } from '@segment/analytics-node'
import { AnalyticsTypeConfig } from './Analytics'
import AnalyticsProvider, { AnalyticsUserEvent } from './AnalyticsProvider'

export interface SegmentConfig extends AnalyticsTypeConfig {
    driver: 'segment'
    writeKey: string
}

export default class SegmentAnalyticsProvider implements AnalyticsProvider {

    segment: Segment
    constructor({ writeKey }: SegmentConfig) {
        this.segment = new Segment({ writeKey })
    }

    async track(event: AnalyticsUserEvent) {
        this.segment.track({
            userId: event.external_id,
            event: event.name,
            properties: event.data,
        })
    }
}
