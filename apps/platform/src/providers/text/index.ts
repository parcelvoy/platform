import { loadProvider } from '../ProviderRepository'
import { loadControllers } from '../ProviderService'
import HttpSMSTextProvider from './HttpSMSProvider'
import LoggerTextProvider from './LoggerTextProvider'
import NexmoTextProvider from './NexmoTextProvider'
import PlivoTextProvider from './PlivoTextProvider'
import TextChannel from './TextChannel'
import { TextProvider, TextProviderName } from './TextProvider'
import TwilioTextProvider from './TwilioTextProvider'

export const typeMap = {
    nexmo: NexmoTextProvider,
    plivo: PlivoTextProvider,
    twilio: TwilioTextProvider,
    httpsms: HttpSMSTextProvider,
    logger: LoggerTextProvider,
}

export const providerMap = (record: { type: TextProviderName }): TextProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadTextChannel = async (providerId: number, projectId?: number): Promise<TextChannel | undefined> => {
    const provider = await loadProvider(providerId, providerMap, projectId)
    if (!provider) return
    return new TextChannel(provider)
}

export const loadTextControllers = loadControllers(typeMap, 'text')
