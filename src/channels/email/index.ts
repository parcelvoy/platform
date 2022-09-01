import { Database } from '../../config/database'
import { defaultProvider } from '../../env/Provider'
import EmailChannel from './EmailChannel'
import EmailProvider, { EmailProviderName } from './EmailProvider'
import LoggerEmailProvider from './LoggerEmailProvider'
import SESEmailProvider from './SESEmailProvider'
import SMTPEmailProvider from './SMPTEmailProvider'

export const providerMap = (record: { name: EmailProviderName }): EmailProvider => {
    return {
        ses: SESEmailProvider.fromJson(record),
        smtp: SMTPEmailProvider.fromJson(record),
        logger: LoggerEmailProvider.fromJson(record),
    }[record.name]
}

export const loadChannel = async (db: Database): Promise<EmailChannel | undefined> => {
    const provider = await defaultProvider('email', providerMap, db)
    if (!provider) return
    return new EmailChannel(provider)
}
