import { RuleTree } from '../rules/Rule'
import { ClientAliasParams, ClientIdentity } from '../client/Client'
import { PageParams } from '../core/searchParams'
import { RetryError } from '../queue/Job'
import { subscribeAll } from '../subscriptions/SubscriptionService'
import { Device, DeviceParams, User, UserInternalParams } from '../users/User'
import { uuid } from '../utilities'
import { getRuleEventNames } from '../rules/RuleHelpers'
import { UserEvent } from './UserEvent'
import { Context } from 'koa'
import { EventPostJob } from '../jobs'

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

export const getUsersFromIdentity = async (projectId: number, identity: ClientIdentity) => {
    const externalId = `${identity.external_id}`
    const anonymousId = `${identity.anonymous_id}`

    const users = await User.all(
        qb => qb
            .where(sqb => {
                if (identity.external_id) {
                    sqb.where('external_id', externalId)
                }
                if (identity.anonymous_id) {
                    sqb.orWhere('anonymous_id', anonymousId)
                }
            })
            .where('project_id', projectId)
            .limit(2),
    )

    // Map each ID to a key so they are both available
    return {
        anonymous: users.find(user => user.anonymous_id === anonymousId),
        external: users.find(user => user.external_id === externalId),
    }
}

export const getUserFromClientId = async (projectId: number, identity: ClientIdentity): Promise<User | undefined> => {
    const users = await getUsersFromIdentity(projectId, identity)

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

export const createUser = async (projectId: number, { external_id, anonymous_id, data, created_at, ...fields }: UserInternalParams) => {
    const user = await User.insertAndFetch({
        project_id: projectId,
        anonymous_id: anonymous_id ?? uuid(),
        external_id,
        data: data ?? {},
        created_at: created_at ? new Date(created_at) : new Date(),
        ...fields,
    })

    // Subscribe the user to all channels the user has available
    await subscribeAll(user)

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

export const saveDevice = async (projectId: number, { external_id, anonymous_id, ...params }: DeviceParams): Promise<Device | undefined> => {

    const user = await getUserFromClientId(projectId, { external_id, anonymous_id } as ClientIdentity)
    if (!user) throw new RetryError()

    let isFirstDevice = false
    if (!user.devices) {
        user.devices = []
        isFirstDevice = true
    }
    let device = user.devices?.find(device => {
        return device.device_id === params.device_id
            || (device.token === params.token && device.token != null)
    })
    if (device) {
        Object.assign(device, params)
    } else {
        device = {
            ...params,
            device_id: params.device_id,
        }
        user.devices.push(device)
    }
    await User.updateAndFetch(user.id, { devices: user.devices })

    if (isFirstDevice) {
        await subscribeAll(user, ['push'])
    }
    return device
}

export const disableNotifications = async (userId: number, tokens: string[]): Promise<boolean> => {
    const user = await User.find(userId)
    if (!user) return false
    const device = user.devices?.find(device => device.token && tokens.includes(device.token))
    if (device) device.token = undefined
    await User.update(qb => qb.where('id', userId), {
        devices: user.devices,
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
    return UserEvent.all(qb => {
        qb.whereIn('user_id', userIds)
            .whereIn('name', names)
            .orderBy('id', 'asc')
        if (since) qb.where('created_at', '>=', since)
        return qb
    })
}

export const isUserDirty = (params: UserInternalParams) => {
    const hasData = !!params.data && Object.keys(params.data).length > 0
    const hasReserved = !!params.email || !!params.phone || !!params.timezone || !!params.locale || !!params.created_at

    return hasData || hasReserved
}
