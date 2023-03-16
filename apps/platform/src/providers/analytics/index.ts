import Router from '@koa/router'
import { ProviderMeta } from '../Provider'
import { loadDefaultProvider } from '../ProviderRepository'
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

export const loadAnalyticsControllers = async (router: Router, providers: ProviderMeta[]) => {
    for (const type of Object.values(typeMap)) {
        const controllers = type.controllers()
        router.use(
            controllers.routes(),
            controllers.allowedMethods(),
        )
        providers.push({
            ...type.meta,
            type: type.namespace,
            channel: 'analytics',
            schema: type.schema,
        })
    }
}
