import { randomUUID } from 'crypto'
import { Chunker } from '.'
import App from '../app'
import List from '../lists/List'
import { staticListRule } from '../lists/ListService'
import { fetchAndCompileRule } from '../rules/RuleService'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { logger } from '../config/logger'
import { cacheDel, cacheGet } from '../config/redis'
import { raw } from '../core/Model'
import MigrateJob from '../organizations/MigrateJob'

export const migrateToClickhouse = async () => {
    const jobs = []
    const shouldMigrateUsers = await cacheGet<boolean>('migration:users') ?? false
    if (shouldMigrateUsers) jobs.push(MigrateJob.from({ type: 'users' }).jobId('migrate_users'))

    const shouldMigrateEvents = await cacheGet<boolean>('migration:events') ?? false
    if (shouldMigrateEvents) jobs.push(MigrateJob.from({ type: 'events' }).jobId('migrate_events'))

    const shouldMigrateLists = await cacheGet<boolean>('migration:lists') ?? false
    if (shouldMigrateLists) jobs.push(MigrateJob.from({ type: 'lists' }).jobId('migrate_lists'))
    await App.main.queue.enqueueBatch(jobs)
}

export const migrateUsers = async (since?: Date, id?: number) => {
    logger.info('parcelvoy:migration users start')
    const users = await User.query()
        .select('users.*', raw("CONCAT('[', GROUP_CONCAT(user_subscription.subscription_id), ']') AS unsubscribe_ids"))
        .leftJoin('user_subscription', (qb) => {
            qb.on('user_subscription.user_id', '=', 'users.id')
                .andOn('user_subscription.state', raw('0'))
        })
        .where(sqb => {
            if (id) {
                sqb.where('id', '>', id)
            }
            if (since) {
                sqb.where('users.created_at', '>', since)
            }
        })
        .groupBy('users.id')
        .stream()

    const size = 1000
    const chunker = new Chunker<User>(async users => {
        const data = []
        for (const user of users) {
            if (since || id) data.push({ ...user, sign: -1 })
            data.push({ ...user, sign: 1 })
        }
        await User.clickhouse().insert(data)
    }, size)

    for await (const user of users) {
        user.unsubscribe_ids = user.unsubscribe_ids ? JSON.parse(user.unsubscribe_ids) : []
        await chunker.add(user)
    }

    await chunker.flush()
    logger.info('parcelvoy:migration users finished')
    await cacheDel('migration:users')
}

export const migrateEvents = async (since?: Date) => {
    logger.info('parcelvoy:migration events start')
    const events = await App.main
        .db('user_events')
        .where((sqb) => {
            if (since) {
                sqb.where('created_at', '>', since)
            }
        })
        .stream()

    const size = 1000
    const chunker = new Chunker<UserEvent>(async events => {
        await UserEvent.clickhouse().insert(events.map(event => ({ ...event, uuid: randomUUID() })))
    }, size)

    for await (const event of events) {
        await chunker.add(event)
    }

    await chunker.flush()
    logger.info('parcelvoy:migration events finished')
    await cacheDel('migration:events')
}

export const migrateStaticList = async ({ id, project_id }: List) => {
    const users = await App.main.db('user_list').where('list_id', id).stream()

    const size = 1000
    const chunker = new Chunker<{ user_id: number, list_id: number, created_at: number, version: number }>(async users => {
        await UserEvent.clickhouse().insert(
            users.map(user => ({
                name: 'user_imported_to_list',
                user_id: user.user_id,
                project_id,
                data: {
                    list_id: user.list_id,
                    version: user.version,
                },
                uuid: randomUUID(),
                created_at: new Date(user.created_at),
            })),
        )
    }, size)

    for await (const user of users) {
        await chunker.add(user)
    }

    await chunker.flush()
}

export const migrateLists = async () => {
    logger.info('parcelvoy:migration lists start')
    const lists = await List.all(qb => qb.whereNull('deleted_at'))
    for (const list of lists) {
        if (!list.rule) {
            const rule = list.type === 'dynamic' && list.rule_id
                ? await fetchAndCompileRule(list.rule_id)
                : staticListRule(list)
            await List.update(qb => qb.where('id', list.id), {
                rule,
            })

            if (list.type === 'static') {
                await migrateStaticList(list)
            }
        }
    }

    logger.info('parcelvoy:migration lists finished')
    await cacheDel('migration:lists')
}
