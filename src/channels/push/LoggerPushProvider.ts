import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { Push, PushResponse } from './Push'
import { PushProvider } from './PushProvider'
export default class LoggerPushProvider extends PushProvider {
    addLatency?: boolean

    async send(push: Push): Promise<PushResponse> {

        // Allow for having random latency to aid in performance testing
        if (this.addLatency) await sleep(randomInt())

        logger.info(push, 'provider:push:logger')
        return {
            push,
            success: true,
            response: '',
        }
    }
}
