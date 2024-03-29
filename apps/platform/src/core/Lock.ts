import App from '../app'
import { logger } from '../config/logger'
import { uuid } from '../utilities'

interface LockParams {
    key: string
    owner?: string
    timeout?: number
}

export const acquireLock = async ({
    key,
    owner,
    timeout = 60,
}: LockParams) => {
    try {
        const result = await App.main.redis.set(
            `lock:${key}`,
            owner ?? uuid(),
            'EX',
            timeout,
            'NX',
        )

        // Because of the NX condition, value will only be set
        // if it hasn't been set already (original owner)
        if (result === null) {

            // Since we know there already is a lock, lets see if
            // it is this instance that owns it
            if (owner) {
                const value = await App.main.redis.get(`lock:${key}`)
                return value === owner
            }
            return false
        }
        return true
    } catch (err) {
        logger.warn({ err, key, timeout }, 'lock:error')
        return false
    }
}

export const releaseLock = async (key: string) => {
    await App.main.redis.del(`lock:${key}`)
}
