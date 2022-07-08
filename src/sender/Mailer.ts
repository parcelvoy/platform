import nodemailer, { Transporter } from 'nodemailer'
import aws from '@aws-sdk/client-ses'
import Render, { Variables } from '../render'

/**
 * The templates corresponding to an email message
 */
export interface EmailMessage {
    from: string
    to: string
    subject: string
    html: string
    text: string
    cc?: string
    bcc?: string
    replyTo?: string
}

interface EmailTypeConfig {
    type: any
}

export interface SESConfig extends EmailTypeConfig {
    type: 'ses'
    region: string
    credentials: { accessKeyId: string, secretAccessKey: string }
}

export interface SMTPConfig extends EmailTypeConfig {
    type: 'smtp'
    port: number
    host: string
    auth: { user: string, pass: string}
}

export type EmailConfig = SESConfig | SMTPConfig

export default class Mailer {
    transport: Transporter
    constructor(config: EmailConfig) {
        if (config.type === 'ses') {
            const ses = new aws.SES({
                region: config.region,
                credentials: config.credentials
            })
            this.transport = nodemailer.createTransport({ 
                SES: { 
                    ses, aws
                }
            })
        }
        else {
            this.transport = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                auth: config.auth,
                secure: true,
                tls: {
                    // do not fail on invalid certs
                    rejectUnauthorized: false,
                }
            })
        }
    }

    async send(options: EmailMessage, variables: Variables) {
        const message: Partial<EmailMessage> = {
            subject: Render(options.subject, variables),
            to: Render(options.to, variables),
            from: Render(options.from, variables),
            html: Render(options.html, variables),
            text: Render(options.text, variables)
        }
        if (options.replyTo) message.replyTo = Render(options.replyTo, variables)
        if (options.cc) message.cc = Render(options.cc, variables)
        if (options.bcc) message.bcc = Render(options.bcc, variables)

        await this.transport.sendMail(message)
    }

    async verify(): Promise<boolean> {
        try {
            return await this.transport.verify()
        }
        catch (error) {
            throw error
        }
    }
}