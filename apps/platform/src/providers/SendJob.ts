import App from '../app'
import { RateLimitResponse } from '../config/rateLimit'
import { EncodedJob, Job } from '../queue'
import EmailChannel from './email/EmailChannel'
import TextChannel from './text/TextChannel'

export default class SendJob extends Job {
    static async throttle(channel: EmailChannel | TextChannel): Promise<RateLimitResponse | undefined> {
        const provider = channel.provider

        // If no rate limit, just break
        if (!provider.rate_limit) return

        // Otherwise consume points and check rate
        return await App.main.rateLimiter.consume(
            `ratelimit-${provider.id}`,
            provider.rate_limit,
        )
    }

    static async requeue(job: EncodedJob, delay: number): Promise<void> {
        job.options.delay = delay
        return this.from(job).queue()
    }
}
