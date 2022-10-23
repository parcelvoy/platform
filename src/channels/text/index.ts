import Router from '@koa/router'
import { defaultProvider, getProviderByExternalId } from '../ProviderRepository'
import LoggerTextProvider from './LoggerTextProvider'
import NexmoTextProvider from './NexmoTextProvider'
import PlivoTextProvider from './PlivoTextProvider'
import TextChannel from './TextChannel'
import { TextProvider, TextProviderName } from './TextProvider'
import TwilioTextProvider from './TwilioTextProvider'

const typeMap = {
    nexmo: NexmoTextProvider,
    plivo: PlivoTextProvider,
    twilio: TwilioTextProvider,
    logger: LoggerTextProvider,
}

export const providerMap = (record: { name: TextProviderName }): TextProvider => {
    return typeMap[record.name].fromJson(record)
}

export const loadTextChannel = async (projectId: number): Promise<TextChannel | undefined> => {
    const provider = await defaultProvider('text', projectId, providerMap)
    if (!provider) return
    return new TextChannel(provider)
}

export const loadTextChannelInbound = async (inboundNumber: string): Promise<TextChannel | undefined> => {
    const provider = await getProviderByExternalId(inboundNumber, providerMap)
    if (!provider) return
    return new TextChannel(provider)
}

export const loadTextControllers = async (router: Router) => {
    for (const type of Object.values(typeMap)) {
        const controllers = type.controllers()
        router.use(
            controllers.routes(),
            controllers.allowedMethods(),
        )
    }
}
