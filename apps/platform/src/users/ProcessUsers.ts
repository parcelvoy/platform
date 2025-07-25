import { Chunker } from '../utilities'
import App from '../app'
import { logger } from '../config/logger'
import { cacheBatchHash, cacheBatchReadHashAndDelete, cacheDel, cacheGet, cacheHashExists, cacheSet, DataPair, HashScanCallback } from '../config/redis'
import { User } from './User'

type CachedQueryParams = {
    query: string
    cacheKey: string,
    itemMap: (data: any) => DataPair
    callback: HashScanCallback
    beforeCallback?: (count: number) => Promise<void>
    afterCallback?: () => Promise<void>
}

export const processUsers = async ({
    query,
    cacheKey,
    itemMap,
    callback,
    beforeCallback,
    afterCallback,
}: CachedQueryParams) => {

    const redis = App.main.redis
    const hashKey = cacheKey
    const hashKeyReady = `${hashKey}:ready`
    const hashExists = await cacheHashExists(redis, hashKey)
    const isReady = await cacheGet(redis, hashKeyReady)

    const cleanupQuery = async () => {
        await afterCallback?.()
        await cacheDel(redis, hashKeyReady)
        await cacheDel(redis, hashKey)
    }

    logger.info({
        source: hashExists ? 'cache' : 'clickhouse',
        key: hashKey,
    }, 'users:generate:started')

    // Return users from the hash if they exist
    if (hashExists && isReady) {
        await cacheBatchReadHashAndDelete(redis, hashKey, callback)
        await cleanupQuery()
    }

    logger.info({
        query,
        key: hashKey,
    }, 'users:generate:querying')

    // Generate the initial send list from ClickHouse
    const result = await User.clickhouse().query(query, {}, {
        max_block_size: '16384',
        send_progress_in_http_headers: 1,
        http_headers_progress_interval_ms: '110000', // 110 seconds
    })

    // Load the results into a Redis hash for easy retrieval
    let count = 0
    const chunker = new Chunker<DataPair>(async pairs => {
        count += pairs.length
        await cacheBatchHash(redis, hashKey, pairs)
    }, 2500)

    // Stream the data from ClickHouse and pass it to the Redis chunker
    for await (const chunk of result.stream() as any) {
        for (const result of chunk) {
            const item = result.json()
            await chunker.add(itemMap(item))
        }
    }
    await chunker.flush()

    // Prepare anything before running, otherwise just set the ready flag
    await beforeCallback?.(count)
    await cacheSet(redis, hashKeyReady, 1, 86400)

    // Now that we have results, pass them back to the callback
    await cacheBatchReadHashAndDelete(redis, hashKey, callback)
    await cleanupQuery()
}
