import IORedis, { Redis } from 'ioredis'

export interface RedisConfig {
    host: string
    port: number
    tls: boolean
}

export const DefaultRedis = (config: RedisConfig, extraOptions = {}): Redis => {
    return new IORedis({
        port: config.port,
        host: config.host,
        tls: config.tls
            ? { rejectUnauthorized: false }
            : undefined,
        ...extraOptions,
    })
}

export { Redis }
