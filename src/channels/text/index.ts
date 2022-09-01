import { Database } from '../../config/database'
import { defaultProvider } from '../../env/Provider'
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

export const loadChannel = async (db: Database): Promise<TextChannel | undefined> => {
    const provider = await defaultProvider('text', providerMap, db)
    if (!provider) return
    return new TextChannel(provider)
}
