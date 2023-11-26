import { DefaultRedis, Redis, RedisConfig } from './redis'

const slidingRateLimiterLuaScript = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local points = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])

    local current_time = redis.call('TIME')
    local trim_time = tonumber(current_time[1]) - window
    redis.call('ZREMRANGEBYSCORE', key, 0, trim_time)
    local request_count = redis.call('ZCARD', key)
    local exp = redis.call('TTL', key)

    -- If we haven't exceeded the limit, lets add value
    if request_count < limit then

        -- Add the current time to the sorted set as many times as points
        for i = 1,points
        do 
            redis.call('ZADD', key, current_time[1], current_time[1] .. current_time[2] .. i)
        end

        -- Set the expiration of the set to the window size
        redis.call('EXPIRE', key, window)
        
        request_count = request_count + points
        return {request_count, 0, window}
    end
    return {request_count, 1, exp}
`

interface RateLimitRedis extends Redis {
    slidingRateLimiter(key: string, window: number, points: number, limit: number): Promise<[consumed: number, exceeded: number, exp: number]>
}

export interface RateLimitOptions {
    limit?: number
    points?: number
    msDuration?: number
}

export interface RateLimitResponse {
    exceeded: boolean
    pointsRemaining: number
    pointsUsed: number
    expires: number
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

    async consume(key: string, { limit = 10, points = 1, msDuration = 1000 }: RateLimitOptions): Promise<RateLimitResponse> {
        const window = Math.floor(msDuration / 1000)
        const [consumed, exceeded, expires] = await this.client.slidingRateLimiter(key, window, points, limit)
        return {
            exceeded: exceeded === 1,
            pointsRemaining: Math.max(0, limit - consumed),
            pointsUsed: consumed,
            expires,
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
