import nodemailer from 'nodemailer'
import { LoggerProviderName } from '../../config/logger'
import { Provider } from '../../core/Provider'
import { Email } from './Email'

export type EmailProviderName = 'ses' | 'smtp' | LoggerProviderName

export default abstract class EmailProvider extends Provider {

    unsubscribe?: string
    transport?: nodemailer.Transporter
    boot?(): void

    async send(message: Email): Promise<any> {
        try {
            const list = this.unsubscribe
                ? { unsubscribe: [this.unsubscribe] }
                : undefined

            return await this.transport?.sendMail({
                ...message,
                list,
            })
        } catch (err) {
            console.log(err)
        }
    }

    async verify(): Promise<boolean> {
        await this.transport?.verify()
        return true
    }
}
