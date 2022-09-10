import nodemailer from 'nodemailer'
import { LoggerProviderName } from '../../config/logger'
import { Provider } from '../../core/Provider'
import { Email } from './Email'

export type EmailProviderName = 'ses' | 'smtp' | LoggerProviderName

export default abstract class EmailProvider extends Provider {

    transport?: nodemailer.Transporter
    boot?(): void

    async send(message: Email): Promise<any> {
        return await this.transport?.sendMail(message)
    }

    async verify(): Promise<boolean> {
        await this.transport?.verify()
        return true
    }
}
