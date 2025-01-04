import IORedis, { Redis } from 'ioredis'

export interface RedisConfig {
    host: string
    port: number
    username?: string
    password?: string
    tls: boolean
}

export const DefaultRedis = ({ port, host, username, password, tls }: RedisConfig, extraOptions = {}): Redis => {
    return new IORedis({
        port,
        host,
        ...username && { username },
        ...password && { password },
        tls: tls
            ? { rejectUnauthorized: false }
            : undefined,
        ...extraOptions,
    })
}

export const cacheGet = async <T>(redis: Redis, key: string): Promise<T | undefined> => {
    const value = await redis.get(key)
    if (!value) return undefined
    return JSON.parse(value) as T
}

export const cacheSet = async <T>(redis: Redis, key: string, value: T, ttl?: number) => {
    await redis.set(key, JSON.stringify(value))
    if (ttl) {
        await redis.expire(key, ttl)
    }
}

export const cacheDel = async (redis: Redis, key: string) => {
    return await redis.del(key)
}

export const cacheIncr = async (redis: Redis, key: string, incr = 1, ttl?: number) => {
    const val = await redis.incrby(key, incr)
    if (ttl) {
        await redis.expire(key, ttl)
    }
    return val
}

export const cacheDecr = async (redis: Redis, key: string, ttl?: number) => {
    const val = await redis.decr(key)
    if (ttl) {
        await redis.expire(key, ttl)
    }
    return val
}

export { Redis }
