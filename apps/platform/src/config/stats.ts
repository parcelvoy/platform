import { Redis } from 'ioredis'
import { DefaultRedis, RedisConfig } from './redis'

export default (config: RedisConfig) => {
    return new Stats(config)
}

export class Stats {
    client: Redis
    ttl: number

    constructor(config: RedisConfig, ttl = 60 * 60 * 4) {
        this.client = DefaultRedis(config)
        this.ttl = ttl
    }

    async increment(prefix: string | string[], value = 1): Promise<void> {
        const prefixes = Array.isArray(prefix) ? prefix : [prefix]
        const time = this.getTime(Date.now())
        const multi = this.client.multi()
        for (const prefix of prefixes) {
            const key = `stats:${prefix}:${time}`
            multi.incrby(key, value)
            multi.expire(key, this.ttl)
        }
        await multi.exec()
    }

    async list(prefix: string) {
        const multi = this.client.multi()
        const minutes = this.ttl / 60
        const time = this.getTime()

        const keys: number[] = []
        for (let i = 0; i <= minutes; i++) {
            const timestamp = time - i * 60
            const key = `stats:${prefix}:${timestamp}`
            multi.get(key)
            keys.push(timestamp)
        }

        const results = (await multi.exec()) ?? []
        return results.map(([_, value]: any, index) => ({
            date: keys[index] * 1000,
            count: parseInt(value ?? 0),
        }))
    }

    private getTime(timestamp: number = Date.now()): number {
        const seconds = Math.floor(timestamp / 1000)
        return Math.floor(seconds / 60) * 60
    }
}
