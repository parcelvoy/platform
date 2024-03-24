import { loadProvider } from '../ProviderRepository'
import EmailChannel from './EmailChannel'
import EmailProvider, { EmailProviderName } from './EmailProvider'
import LoggerEmailProvider from './LoggerEmailProvider'
import MailgunEmailProvider from './MailgunEmailProvider'
import SESEmailProvider from './SESEmailProvider'
import SMTPEmailProvider from './SMPTEmailProvider'
import SendGridEmailProvider from './SendGridEmailProvider'

type EmailProviderDerived = { new (): EmailProvider } & typeof EmailProvider
export const typeMap: Record<string, EmailProviderDerived> = {
    mailgun: MailgunEmailProvider,
    sendgrid: SendGridEmailProvider,
    ses: SESEmailProvider,
    smtp: SMTPEmailProvider,
    logger: LoggerEmailProvider,
}

export const providerMap = (record: { type: EmailProviderName }): EmailProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadEmailChannel = async (providerId: number, projectId: number): Promise<EmailChannel | undefined> => {
    const provider = await loadProvider(providerId, providerMap, projectId)
    if (!provider) return
    return new EmailChannel(provider)
}

export const emailProviders = Object.values(typeMap)
