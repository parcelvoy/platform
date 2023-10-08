import nodemailer from 'nodemailer'
import { LoggerProviderName } from '../LoggerProvider'
import Provider from '../Provider'
import { Email } from './Email'

export type EmailProviderName = 'ses' | 'smtp' | 'mailgun' | 'sendgrid' | LoggerProviderName

export default abstract class EmailProvider extends Provider {

    unsubscribe?: string
    transport?: nodemailer.Transporter
    boot?(): void

    async send(message: Email): Promise<any> {
        const list = this.unsubscribe
            ? { unsubscribe: [this.unsubscribe] }
            : undefined

        return await this.transport?.sendMail({
            ...message,
            list,
        })
    }

    async verify(): Promise<boolean> {
        await this.transport?.verify()
        return true
    }
}
