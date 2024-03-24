import { loadDefaultProvider } from '../ProviderRepository'
import Analytics from './Analytics'
import { AnalyticsProvider, AnalyticsProviderName } from './AnalyticsProvider'
import MixpanelAnalyticsProvider from './MixpanelProvider'
import PostHogAnalyticsProvider from './PosthogProvider'
import SegmentAnalyticsProvider from './SegmentProvider'

type AnalyticsProviderDerived = { new (): AnalyticsProvider } & typeof AnalyticsProvider
export const typeMap: Record<string, AnalyticsProviderDerived> = {
    segment: SegmentAnalyticsProvider,
    posthog: PostHogAnalyticsProvider,
    mixpanel: MixpanelAnalyticsProvider,
}

export const providerMap = (record: { type: AnalyticsProviderName }): AnalyticsProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadAnalytics = async (projectId: number): Promise<Analytics> => {
    const provider = await loadDefaultProvider('analytics', projectId, providerMap)
    return new Analytics(provider)
}

export const analyticsProviders = Object.values(typeMap)
