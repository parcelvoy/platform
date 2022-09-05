import { defaultProvider } from '../../core/Provider'
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

export const loadEmailChannel = async (projectId: number): Promise<EmailChannel | undefined> => {
    const provider = await defaultProvider('email', projectId, providerMap)
    if (!provider) return
    return new EmailChannel(provider)
}
