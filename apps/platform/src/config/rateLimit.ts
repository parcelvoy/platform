import { DefaultRedis, Redis, RedisConfig } from './redis'

// eslint-disable-next-line quotes
const incrTtlLuaScript = `redis.call('set', KEYS[1], 0, 'EX', ARGV[2], 'NX') \
local consumed = redis.call('incrby', KEYS[1], ARGV[1]) \
local ttl = redis.call('pttl', KEYS[1]) \
if ttl == -1 then \
  redis.call('expire', KEYS[1], ARGV[2]) \
  ttl = 1000 * ARGV[2] \
end \
return {consumed, ttl} \
`

interface RateLimitRedis extends Redis {
    rlflxIncr(key: string, points: number, secDuration: number): Promise<[ consumed: number, ttl: number ]>
}

export interface RateLimitResponse {
    exceeded: boolean
    pointsRemaining: number
    pointsUsed: number
    msRemaining: number
}

export default (config: RedisConfig) => {
    return new RateLimiter(config)
}

export class RateLimiter {
    client: RateLimitRedis
    constructor(config: RedisConfig) {
        this.client = DefaultRedis(config) as RateLimitRedis
        this.client.defineCommand('rlflxIncr', {
            numberOfKeys: 1,
            lua: incrTtlLuaScript,
        })
    }

    async consume(key: string, limit: number, msDuration = 1000): Promise<RateLimitResponse> {
        const secDuration = Math.floor(msDuration / 1000)
        const response = await this.client.rlflxIncr(key, 1, secDuration)
        return {
            exceeded: response[0] > limit,
            pointsRemaining: Math.max(0, limit - response[0]),
            pointsUsed: response[0],
            msRemaining: response[1],
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
