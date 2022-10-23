import nodemailer from 'nodemailer'
import aws = require('@aws-sdk/client-ses')
import { AWSConfig } from '../../core/aws'
import EmailProvider from './EmailProvider'
import Router = require('@koa/router')
import { ExternalProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'

interface SESDataParams {
    config: AWSConfig
}

type SESEmailProviderParams = Pick<SESEmailProvider, keyof ExternalProviderParams>

export default class SESEmailProvider extends EmailProvider {
    config!: AWSConfig

    boot() {
        const ses = new aws.SES({
            region: this.config.region,
            credentials: this.config.credentials,
        })

        this.transport = nodemailer.createTransport({
            SES: {
                ses, aws,
            },
        })
    }

    static controllers(): Router {
        const providerParams = ProviderSchema<SESEmailProviderParams, SESDataParams>('sesProviderParams', {
            type: 'object',
            required: ['config'],
            properties: {
                config: {
                    type: 'object',
                    required: ['region', 'credentials'],
                    properties: {
                        region: { type: 'string' },
                        credentials: {
                            type: 'object',
                            required: ['accessKeyId', 'secretAccessKey'],
                            properties: {
                                accessKeyId: { type: 'string' },
                                secretAccessKey: { type: 'string' },
                            },
                        },
                    },
                },
            },
            additionalProperties: false,
        })

        return createController('email', 'ses', providerParams)
    }
}
