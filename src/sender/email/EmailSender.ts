import nodemailer from 'nodemailer'
import aws, * as AWS from '@aws-sdk/client-ses'
import Render, { Variables } from '../../render'
import { AWSConfig } from '../../config/aws'
import { logger, LoggerConfig, LoggerDriver } from '../../config/logger'
import { DriverConfig } from '../../config/env'
import { EmailTemplate } from '../../models/Template'
import { Email } from './Email'

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
    sendMail(message: Email): Promise<any>
    verify(): Promise<true>
}

export type EmailConfig = SESConfig | SMTPConfig | LoggerConfig

export default class EmailSender {
    transport: EmailTransporter
    constructor(config?: EmailConfig) {
        if (config?.driver === 'ses') {
            const ses = new AWS.SES({
                region: config.region,
                credentials: config.credentials,
            })
            const transport = nodemailer.createTransport({
                SES: {
                    ses, aws,
                },
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
                auth: config.auth,
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

    async send(options: EmailTemplate, variables: Variables) {
        const message: Email = {
            subject: Render(options.subject, variables),
            to: Render(options.to, variables),
            from: Render(options.from, variables),
            html_body: Render(options.html_body, variables),
            text_body: Render(options.text_body, variables),
        }
        if (options.reply_to) message.reply_to = Render(options.reply_to, variables)
        if (options.cc) message.cc = Render(options.cc, variables)
        if (options.bcc) message.bcc = Render(options.bcc, variables)

        await this.transport.sendMail(message)
    }

    async verify(): Promise<boolean> {
        await this.transport.verify()
        return true
    }
}
