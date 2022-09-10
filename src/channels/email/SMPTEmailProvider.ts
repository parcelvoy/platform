import nodemailer from 'nodemailer'
import EmailProvider from './EmailProvider'

export default class SMTPEmailProvider extends EmailProvider {
    host!: string
    port!: number
    secure!: boolean
    auth!: { user: string, pass: string }

    boot() {
        this.transport = nodemailer.createTransport({
            host: this.host,
            port: this.port,
            secure: this.secure,
            auth: this.auth,
        })
    }
}
