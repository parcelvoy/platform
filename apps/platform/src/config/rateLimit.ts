import { DefaultRedis, Redis, RedisConfig } from './redis'

const slidingRateLimiterLuaScript = `
    local current_time = redis.call('TIME')
    local trim_time = tonumber(current_time[1]) - ARGV[1]
    redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, trim_time)
    local request_count = redis.call('ZCARD', KEYS[1])

    if request_count < tonumber(ARGV[2]) then
        redis.call('ZADD', KEYS[1], current_time[1], current_time[1] .. current_time[2])
        redis.call('EXPIRE', KEYS[1], ARGV[1])
        return {request_count, 0}
    end
    return {request_count, 1}
`

interface RateLimitRedis extends Redis {
    slidingRateLimiter(key: string, window: number, points: number): Promise<[consumed: number, exceeded: number]>
}

export interface RateLimitResponse {
    exceeded: boolean
    pointsRemaining: number
    pointsUsed: number
}

export default (config: RedisConfig) => {
    return new RateLimiter(config)
}

export class RateLimiter {
    client: RateLimitRedis
    constructor(config: RedisConfig) {
        this.client = DefaultRedis(config) as RateLimitRedis
        this.client.defineCommand('slidingRateLimiter', {
            numberOfKeys: 1,
            lua: slidingRateLimiterLuaScript,
        })
    }

    async consume(key: string, limit: number, msDuration = 1000): Promise<RateLimitResponse> {
        const window = Math.floor(msDuration / 1000)
        const [consumed, exceeded] = await this.client.slidingRateLimiter(key, window, limit)

        return {
            exceeded: exceeded === 1,
            pointsRemaining: Math.max(0, limit - consumed),
            pointsUsed: consumed,
        }
    }

    async get(key: string) {
        const response = await this.client
            .multi()
            .get(key)
            .pttl(key)
            .exec()
        if (!response) return undefined
        return {
            pointsUsed: parseInt(response[0][1] as string, 10),
            msRemaining: response[1][1],
        }
    }

    async close() {
        this.client.disconnect()
    }
}
