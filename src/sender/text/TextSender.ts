import { DriverConfig } from '../../config/env'
import { LoggerConfig } from '../../config/logger'
import render, { Variables } from '../../render'
import LoggerTextProvider from './LoggerTextProvider'
import NexmoProvider, { NexmoConfig } from './NexmoTextProvider'
import PlivoTextProvider, { PlivoConfig } from './PlivoTextProvider'
import { TextMessage, TextResponse } from './TextMessage'
import TwilioTextProvider, { TwilioConfig } from './TwilioTextProvider'

export type TextDriver = 'nexmo' | 'plivo' | 'twilio' | 'logger'
export interface TextTypeConfig extends DriverConfig {
    driver: TextDriver
}

export type TextConfig = NexmoConfig | PlivoConfig | TwilioConfig | LoggerConfig

export interface TextProvider {
    send(message: TextMessage): Promise<TextResponse>
}

export default class TextSender {
    provider: TextProvider
    constructor(config?: TextConfig) {
        if (config?.driver === 'nexmo') {
            this.provider = new NexmoProvider(config)
        } else if (config?.driver === 'plivo') {
            this.provider = new PlivoTextProvider(config)
        } else if (config?.driver === 'twilio') {
            this.provider = new TwilioTextProvider(config)
        } else if (config?.driver === 'logger') {
            this.provider = new LoggerTextProvider()
        } else {
            throw new Error('A valid text message driver must be defined!')
        }
    }

    async send(options: TextMessage, variables: Variables) {
        const message = {
            to: options.to,
            from: options.from,
            text: render(options.text, variables),
        }

        await this.provider.send(message)

        // TODO: Create an event for the user the message was sent
    }
}
