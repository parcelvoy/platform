import nodemailer from 'nodemailer'
import aws, * as AWS from '@aws-sdk/client-ses'
import Render, { Variables } from '../../render'
import { AWSConfig } from '../../config/aws'
import { logger, LoggerConfig, LoggerDriver } from '../../config/logger'
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

interface EmailTransporter {
    sendMail (message: Partial<EmailMessage>): Promise<any>
    verify (): Promise<true>
}

export type EmailConfig = SESConfig | SMTPConfig | LoggerConfig

export default class EmailSender {
    transport: EmailTransporter
    constructor (config?: EmailConfig) {
        if (config?.driver === 'ses') {
            const ses = new AWS.SES({
                region: config.region,
                credentials: config.credentials
            })
            const transport = nodemailer.createTransport({
                SES: {
                    ses, aws
                }
            })
            this.transport = {
                sendMail: message => transport.sendMail(message),
                verify: () => transport.verify(),
            }
        } else if (config?.driver === 'smtp') {
            const transport = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: config.auth
            })
            this.transport = {
                sendMail: message => transport.sendMail(message),
                verify: () => transport.verify(),
            }
        } else if (config?.driver === 'logger') {
            this.transport = {
                sendMail: async message => {
                    logger.info(JSON.stringify(message, null, 2))
                },
                verify: () => Promise.resolve(true),
            }
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
