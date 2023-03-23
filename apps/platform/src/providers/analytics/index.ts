import { loadDefaultProvider } from '../ProviderRepository'
import { loadControllers } from '../ProviderService'
import Analytics from './Analytics'
import { AnalyticsProvider, AnalyticsProviderName } from './AnalyticsProvider'
import SegmentAnalyticsProvider from './SegmentProvider'

const typeMap = {
    segment: SegmentAnalyticsProvider,
}

export const providerMap = (record: { type: AnalyticsProviderName }): AnalyticsProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadAnalytics = async (projectId: number): Promise<Analytics> => {
    const provider = await loadDefaultProvider('analytics', projectId, providerMap)
    return new Analytics(provider)
}

export const loadAnalyticsControllers = loadControllers(typeMap, 'analytics')
