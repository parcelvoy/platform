import Router from '@koa/router'
import nodemailer from 'nodemailer'
import { ExternalProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import EmailProvider from './EmailProvider'

interface SMTPDataParams {
    host: string
    port: number
    secure: boolean
    auth: { user: string, pass: string }
}

type SMTPEmailProviderParams = Pick<SMTPEmailProvider, keyof ExternalProviderParams>

export default class SMTPEmailProvider extends EmailProvider {
    host!: string
    port!: number
    secure!: boolean
    auth!: { user: string, pass: string }

    declare data: SMTPDataParams

    boot() {
        this.transport = nodemailer.createTransport({
            host: this.host,
            port: this.port,
            secure: this.secure,
            auth: this.auth,
        })
    }

    static controllers(): Router {
        const providerParams = ProviderSchema<SMTPEmailProviderParams, SMTPDataParams>('smtpProviderParams', {
            type: 'object',
            required: ['host', 'port', 'secure', 'auth'],
            properties: {
                host: { type: 'string' },
                port: { type: 'number' },
                secure: { type: 'boolean' },
                auth: {
                    type: 'object',
                    required: ['user', 'pass'],
                    properties: {
                        user: { type: 'string' },
                        pass: { type: 'string' },
                    },
                },
            },
            additionalProperties: false,
        })

        return createController('email', 'smtp', providerParams)
    }
}
