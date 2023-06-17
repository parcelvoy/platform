import { ClientAliasParams, ClientIdentity } from '../client/Client'
import { InternalError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import { subscribeAll } from '../subscriptions/SubscriptionService'
import { Device, DeviceParams, User, UserParams } from '../users/User'
import { uuid } from '../utilities'
import UserError from './UserError'

export const getUser = async (id: number, projectId?: number): Promise<User | undefined> => {
    return await User.find(id, qb => {
        if (projectId) {
            qb.where('project_id', projectId)
        }
        return qb
    })
}

export const getUsersFromIdentity = async (projectId: number, identity: ClientIdentity) => {
    const users = await User.all(
        qb => qb
            .where(sqb => {
                if (identity.external_id) {
                    sqb.where('external_id', `${identity.external_id}`)
                }
                if (identity.anonymous_id) {
                    sqb.orWhere('anonymous_id', `${identity.anonymous_id}`)
                }
            })
            .where('project_id', projectId)
            .limit(2),
    )

    // Map each ID to a key so they are both available
    return {
        anonymous: users.find(user => user.anonymous_id === identity.anonymous_id),
        external: users.find(user => user.external_id === identity.external_id),
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

export const createUser = async (projectId: number, { external_id, anonymous_id, data, ...fields }: UserParams) => {
    const user = await User.insertAndFetch({
        project_id: projectId,
        anonymous_id: anonymous_id ?? uuid(),
        external_id,
        data: data ?? {},
        ...fields,
    })

    // Subscribe the user to all channels the user has available
    await subscribeAll(user)

    return user
}

export const saveDevice = async (projectId: number, { external_id, anonymous_id, ...params }: DeviceParams): Promise<Device | undefined> => {

    const user = await getUserFromClientId(projectId, { external_id, anonymous_id } as ClientIdentity)
    if (!user) {
        throw new InternalError(UserError.NotFound)
    }

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
