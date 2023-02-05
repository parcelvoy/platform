import Router from '@koa/router'
import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { ExternalProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { Email } from './Email'
import EmailProvider from './EmailProvider'

export default class LoggerEmailProvider extends EmailProvider {
    addLatency?: boolean

    static namespace = 'logger'
    static meta = {
        name: 'Email Logger',
        description: '',
    }

    static schema = ProviderSchema<ExternalProviderParams, any>('loggerEmailProviderParams', {
        type: 'object',
    })

    async send(message: Email): Promise<any> {

        // Allow for having random latency to aid in performance testing
        if (this.addLatency) await sleep(randomInt())

        logger.info(message, 'provider:email:logger')
    }

    async verify(): Promise<boolean> {
        return true
    }

    static controllers(): Router {
        return createController('email', this.namespace, this.schema)
    }
}
