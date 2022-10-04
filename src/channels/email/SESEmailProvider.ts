import nodemailer from 'nodemailer'
import aws = require('@aws-sdk/client-ses')
import { AWSConfig } from '../../core/aws'
import EmailProvider from './EmailProvider'

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
}
