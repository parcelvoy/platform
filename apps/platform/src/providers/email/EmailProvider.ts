import nodemailer from 'nodemailer'
import { LoggerProviderName } from '../LoggerProvider'
import Provider, { ProviderGroup } from '../Provider'
import { Email } from './Email'

export type EmailProviderName = 'ses' | 'smtp' | 'mailgun' | 'sendgrid' | LoggerProviderName

export default abstract class EmailProvider extends Provider {

    unsubscribe?: string
    transport?: nodemailer.Transporter
    boot?(): void

    static group = 'email' as ProviderGroup

    async send(message: Email): Promise<any> {
        return await this.transport?.sendMail(message)
    }

    async verify(): Promise<boolean> {
        await this.transport?.verify()
        return true
    }
}
