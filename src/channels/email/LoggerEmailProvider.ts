import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { Email } from './Email'
import EmailProvider from './EmailProvider'

export default class LoggerEmailProvider extends EmailProvider {
    addLatency?: boolean

    async send(message: Email): Promise<any> {

        // Allow for having random latency to aid in performance testing
        if (this.addLatency) await sleep(randomInt())

        logger.info(message)
    }

    async verify(): Promise<boolean> {
        return true
    }
}
