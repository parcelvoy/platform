import { Chunker } from '../utilities'
import { logger } from '../config/logger'
import { cacheBatchHash, cacheBatchLength, cacheBatchReadHashAndDelete, cacheDel, cacheGet, cacheHashExists, cacheSet, DataPair, HashScanCallback } from '../config/redis'
import { User } from './User'

type CachedQueryParams = {
    query: string
    cacheKey: string,
    itemMap: (data: any) => DataPair
    callback: HashScanCallback
    beforeCallback?: (count: number) => Promise<boolean>
    afterCallback?: () => Promise<void>
}

export const processUsers = async ({
    query,
    cacheKey,
    itemMap,
    callback,
    beforeCallback = async () => true,
    afterCallback,
}: CachedQueryParams) => {

    const hashKey = cacheKey
    const hashKeyReady = `${hashKey}:ready`
    const hashExists = await cacheHashExists(hashKey)
    const isReady = await cacheGet(hashKeyReady)

    const processFromCache = async () => {
        logger.info({
            key: hashKey,
            count: await cacheBatchLength(hashKey),
        }, 'users:generate:loading:started')

        await cacheBatchReadHashAndDelete(hashKey, callback)
        await afterCallback?.()
        await cacheDel(hashKeyReady)
        await cacheDel(hashKey)

        logger.info({ key: hashKey }, 'users:generate:loading:finished')
    }

    logger.info({
        source: hashExists ? 'cache' : 'clickhouse',
        key: hashKey,
    }, 'users:generate:started')

    // Return users from the hash if they exist
    if (hashExists && isReady) {
        await processFromCache()
        return
    }

    logger.info({
        query,
        key: hashKey,
    }, 'users:generate:querying:started')

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
        await cacheBatchHash(hashKey, pairs)
    }, 2500)

    // Stream the data from ClickHouse and pass it to the Redis chunker
    for await (const chunk of result.stream() as any) {
        for (const result of chunk) {
            const item = result.json()
            await chunker.add(itemMap(item))
        }
    }
    await chunker.flush()

    logger.info({
        key: hashKey,
        count,
    }, 'users:generate:querying:finished')

    // Prepare anything before running, otherwise just set the ready flag
    const shouldContinue = await beforeCallback(count)
    if (!shouldContinue) return

    await cacheSet(hashKeyReady, 1, 86400)

    // Now that we have results, pass them back to the callback
    await processFromCache()
}
