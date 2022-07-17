import nodemailer, { Transporter } from 'nodemailer'
import aws, * as AWS from '@aws-sdk/client-ses'
import Render, { Variables } from '../../render'
import { AWSConfig } from '../../config/aws'
import { LoggerConfig, LoggerDriver } from '../../config/logger'
import { DriverConfig } from '../../config/env'

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

export type EmailDriver = 'ses' | 'smtp' | LoggerDriver
interface EmailTypeConfig extends DriverConfig {
    driver: EmailDriver
}

// Amazon SES
export interface SESConfig extends EmailTypeConfig, AWSConfig {
    driver: 'ses'
}

// SMTP, SendGrid, Mailgun
export interface SMTPConfig extends EmailTypeConfig {
    driver: 'smtp'
    host: string
    port: number
    secure: boolean
    auth: { user: string, pass: string }
}

export type EmailConfig = SESConfig | SMTPConfig | LoggerConfig

export default class EmailSender {
    transport: Transporter
    constructor (config?: EmailConfig) {
        if (config?.driver === 'ses') {
            const ses = new AWS.SES({
                region: config.region,
                credentials: config.credentials
            })
            this.transport = nodemailer.createTransport({
                SES: {
                    ses, aws
                }
            })
        } else if (config?.driver === 'smtp') {
            this.transport = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: config.auth
            })
        } else {
            throw new Error('A valid mailer must be defined!')
        }
    }

    async send (options: EmailMessage, variables: Variables) {
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

        // TODO: Create an event for the user that the email was sent
    }

    async verify (): Promise<boolean> {
        await this.transport.verify()
        return true
    }
}
