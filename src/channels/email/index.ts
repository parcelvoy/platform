import Router from '@koa/router'
import { ProviderMeta } from '../Provider'
import { loadProvider } from '../ProviderRepository'
import EmailChannel from './EmailChannel'
import EmailProvider, { EmailProviderName } from './EmailProvider'
import LoggerEmailProvider from './LoggerEmailProvider'
import SESEmailProvider from './SESEmailProvider'
import SMTPEmailProvider from './SMPTEmailProvider'

const typeMap = {
    ses: SESEmailProvider,
    smtp: SMTPEmailProvider,
    logger: LoggerEmailProvider,
}

export const providerMap = (record: { type: EmailProviderName }): EmailProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadEmailChannel = async (providerId: number, projectId: number): Promise<EmailChannel | undefined> => {
    const provider = await loadProvider(providerId, projectId, providerMap)
    if (!provider) return
    return new EmailChannel(provider)
}

export const loadEmailControllers = async (router: Router, providers: ProviderMeta[]) => {
    for (const type of Object.values(typeMap)) {
        const controllers = type.controllers()
        router.use(
            controllers.routes(),
            controllers.allowedMethods(),
        )
        providers.push({
            ...type.meta,
            type: type.namespace,
            channel: 'email',
            schema: type.schema,
        })
    }
}
