import { defaultProvider, getProvider } from '../../core/Provider'
import LoggerTextProvider from './LoggerTextProvider'
import NexmoTextProvider from './NexmoTextProvider'
import PlivoTextProvider from './PlivoTextProvider'
import TextChannel from './TextChannel'
import { TextProvider, TextProviderName } from './TextProvider'
import TwilioTextProvider from './TwilioTextProvider'

export const providerMap = (record: { name: TextProviderName }): TextProvider => {
    return {
        nexmo: NexmoTextProvider.fromJson(record),
        plivo: PlivoTextProvider.fromJson(record),
        twilio: TwilioTextProvider.fromJson(record),
        logger: LoggerTextProvider.fromJson(record),
    }[record.name]
}

export const loadTextChannel = async (projectId: number): Promise<TextChannel | undefined> => {
    const provider = await defaultProvider('text', projectId, providerMap)
    if (!provider) return
    return new TextChannel(provider)
}

export const loadTextChannelInbound = async (inboundNumber: string): Promise<TextChannel | undefined> => {
    const provider = await getProvider(inboundNumber, providerMap)
    if (!provider) return
    return new TextChannel(provider)
}
