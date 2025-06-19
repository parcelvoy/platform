import { RuleTree } from '../rules/Rule'
import { ClientAliasParams, ClientIdentity } from '../client/Client'
import { PageParams } from '../core/searchParams'
import { RetryError } from '../queue/Job'
import { Device, DeviceParams, User, UserInternalParams } from '../users/User'
import { deepEqual, pick, uuid } from '../utilities'
import { getRuleEventNames } from '../rules/RuleHelpers'
import { UserEvent } from './UserEvent'
import { Context } from 'koa'
import { EventPostJob } from '../jobs'
import { Transaction } from '../core/Model'
import App from '../app'

export const getUser = async (id: number, projectId?: number): Promise<User | undefined> => {
    return await User.find(id, qb => {
        if (projectId) {
            qb.where('project_id', projectId)
        }
        return qb
    })
}

export const getUserFromContext = async (ctx: Context): Promise<User | undefined> => {
    return ctx.state.scope === 'secret'
        ? await getUserFromClientId(ctx.state.project.id, { external_id: ctx.params.userId })
        : await getUser(parseInt(ctx.params.userId), ctx.state.project.id)
}

export const getUsersFromIdentity = async (projectId: number, identity: ClientIdentity, trx?: Transaction) => {
    const externalId = `${identity.external_id}`
    const anonymousId = `${identity.anonymous_id}`

    const users = await User.all(
        qb => {
            qb.where(sqb => {
                if (identity.external_id) {
                    sqb.where('external_id', externalId)
                }
                if (identity.anonymous_id) {
                    sqb.orWhere('anonymous_id', anonymousId)
                }
            })
                .where('project_id', projectId)
                .limit(2)
            if (trx) {
                qb.forUpdate()
            }
            return qb
        },
        trx,
    )

    // Map each ID to a key so they are both available
    return {
        anonymous: users.find(user => user.anonymous_id === anonymousId),
        external: users.find(user => user.external_id === externalId),
    }
}

export const getUserFromClientId = async (projectId: number, identity: ClientIdentity, trx?: Transaction): Promise<User | undefined> => {
    const users = await getUsersFromIdentity(projectId, identity, trx)

    // There are circumstances in which both the external ID and
    // the anonymous ID match but match different records in
    // those cases, default to the one matching the external ID
    return users.external ?? users.anonymous
}

export const getUserFromPhone = async (projectId: number, phone: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('phone', phone)
            .where('project_id', projectId),
    )
}

export const getUserFromEmail = async (projectId: number, email: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('email', email)
            .where('project_id', projectId),
    )
}

export const pagedUsers = async (params: PageParams, projectId: number) => {
    return await User.search(
        {
            ...params,
            fields: ['external_id', 'email', 'phone'],
            mode: 'exact',
        },
        b => b.where('project_id', projectId),
    )
}

export const aliasUser = async (projectId: number, {
    external_id,
    anonymous_id,
    previous_id,
}: ClientAliasParams): Promise<User | undefined> => {

    // Previous is the one merging into userId
    const previous = await getUserFromClientId(projectId, {
        external_id: previous_id,
        anonymous_id,
    } as ClientIdentity)
    if (!previous) return

    // Look up if there is a separate profile with the new ID
    // If there is one, update that clients anonymous ID
    const current = await getUserFromClientId(projectId, {
        external_id,
    } as ClientIdentity)
    if (current) return

    return await User.updateAndFetch(previous.id, { external_id })
}

export const createUser = async (projectId: number, { external_id, anonymous_id, data, created_at, ...fields }: UserInternalParams, trx?: Transaction) => {
    const user = await User.insertAndFetch({
        project_id: projectId,
        anonymous_id: anonymous_id ?? uuid(),
        external_id,
        data: data ?? {},
        devices: [],
        created_at: created_at ? new Date(created_at) : new Date(),
        ...fields,
        version: Date.now(),
    }, trx)

    // Send user to ClickHouse as well
    await User.clickhouse().upsert(user)

    // Create an event for the user creation
    await EventPostJob.from({
        project_id: projectId,
        user_id: user.id,
        event: {
            name: 'user_created',
            external_id: user.external_id,
            anonymous_id,
            data: { ...data, ...fields, external_id, anonymous_id },
        },
    }).queue()

    return user
}

export const updateUser = async (existing: User, params: Partial<User>, anonymous?: User, trx?: Transaction): Promise<User> => {
    const { external_id, anonymous_id, data, ...fields } = params
    const hasChanges = isUserDirty(existing, params)
    if (hasChanges) {
        const after = await User.updateAndFetch(existing.id, {
            data: data ? { ...existing.data, ...data } : undefined,
            ...fields,
            ...!anonymous ? { anonymous_id } : {},
            version: Date.now(),
        }, trx)
        await User.clickhouse().upsert(after, existing)
        return after
    }
    return existing
}

export const deleteUser = async (projectId: number, externalId: string): Promise<void> => {
    const user = await getUserFromClientId(projectId, { external_id: externalId } as ClientIdentity)
    if (!user) return

    // Delete the user from ClickHouse
    await User.clickhouse().delete('project_id = {projectId: UInt32} AND id = {id: UInt32}', {
        projectId,
        id: user.id,
    })

    // Delete the user events from ClickHouse
    await UserEvent.clickhouse().delete('project_id = {projectId: UInt32} AND user_id = {userId: UInt32}', {
        projectId,
        userId: user.id,
    })

    // Delete the user from the database
    await User.delete(qb => qb.where('project_id', projectId)
        .where('id', user.id),
    )

    // Delete the user events from the database
    await UserEvent.delete(qb => qb.where('project_id', projectId)
        .where('user_id', user.id),
    )
}

export const saveDevice = async (projectId: number, { external_id, anonymous_id, ...params }: DeviceParams, trx?: Transaction): Promise<Device | undefined> => {

    const user = await getUserFromClientId(projectId, { external_id, anonymous_id } as ClientIdentity, trx)
    if (!user) throw new RetryError()

    const devices = user.devices ? [...user.devices] : []
    let device = devices?.find(device => {
        return device.device_id === params.device_id
            || (device.token === params.token && device.token != null)
    })
    if (device) {
        const newDevice = { ...device, ...params }
        const isDirty = !deepEqual(device, newDevice)
        if (!isDirty) return device
        Object.assign(device, params)
    } else {
        device = {
            ...params,
            device_id: params.device_id,
        }
        devices.push(device)
    }

    const after = await User.updateAndFetch(user.id, {
        devices,
        version: Date.now(),
    }, trx)
    await User.clickhouse().upsert(after, user)

    return device
}

export const disableNotifications = async (userId: number, tokens: string[]): Promise<boolean> => {

    await App.main.db.transaction(async (trx) => {
        const user = await User.find(userId, undefined, trx)
        if (!user) return false
        if (!user.devices?.length) return false

        const devices = [...user.devices]
        const device = devices?.find(device => device.token && tokens.includes(device.token))
        if (device) device.token = undefined

        const after = await User.updateAndFetch(user.id, {
            devices,
            version: Date.now(),
        }, trx)
        await User.clickhouse().upsert(after, user)
    })
    return true
}

export const getUserEventsForRules = async (
    userIds: number[],
    rules: RuleTree[],
    since?: Date | null,
) => {
    if (!userIds.length || !rules.length) return []
    const names = rules.reduce<string[]>((a, rule) => {
        if (rule) {
            a.push(...getRuleEventNames(rule))
        }
        return a
    }, []).filter((o, i, a) => a.indexOf(o) === i)
    if (!names.length) return []
    return UserEvent.clickhouse().all(
        `
        SELECT * FROM user_events 
            WHERE user_id IN ({userIds: Array(UInt32)}) 
            AND name IN ({names: Array(String)}) 
            AND created_at >= {since: DateTime} 
            ORDER BY created_at DESC
        `,
        {
            userIds,
            names,
            since: since ?? new Date(0),
        },
    )
}

const isUserDirty = (existing: User, patch: Partial<User>) => {
    const newData = { ...existing.data, ...patch.data }
    const fields: Array<keyof UserInternalParams> = ['external_id', 'anonymous_id', 'email', 'phone', 'timezone', 'locale']
    const hasDataChanged = !deepEqual(existing.data, newData)
    const haveFieldsChanged = !deepEqual(pick(existing, fields), pick(patch, fields))
    return hasDataChanged || haveFieldsChanged
}
