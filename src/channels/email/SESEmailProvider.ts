import nodemailer from 'nodemailer'
import aws, * as AWS from '@aws-sdk/client-ses'
import { AWSConfig } from '../../config/aws'
import EmailProvider from './EmailProvider'

export default class SESEmailProvider extends EmailProvider {
    config!: AWSConfig

    boot() {
        const ses = new AWS.SES({
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
