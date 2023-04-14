import { ClientAliasParams, ClientIdentity } from '../client/Client'
import { SearchParams } from '../core/searchParams'
import { subscribeAll } from '../subscriptions/SubscriptionService'
import { Device, DeviceParams, User, UserParams } from '../users/User'

export const getUser = async (id: number, projectId?: number): Promise<User | undefined> => {
    return await User.find(id, qb => {
        if (projectId) {
            qb.where('project_id', projectId)
        }
        return qb
    })
}

export const getUserFromClientId = async (projectId: number, identity: ClientIdentity): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where(sqb => {
            if (identity.external_id) {
                sqb.where('external_id', identity.external_id)
            }
            if (identity.anonymous_id) {
                sqb.orWhere('anonymous_id', identity.anonymous_id)
            }
        }).where('project_id', projectId),
    )
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

export const pagedUsers = async (params: SearchParams, projectId: number) => {
    return await User.searchParams(
        params,
        ['external_id', 'email', 'phone'],
        b => b.where({ project_id: projectId }),
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
    return await User.updateAndFetch(previous.id, { external_id })
}

export const createUser = async (projectId: number, { external_id, anonymous_id, data, ...fields }: UserParams) => {
    const user = await User.insertAndFetch({
        project_id: projectId,
        anonymous_id,
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
    if (!user) return

    if (!user.devices) user.devices = []
    const device = user.devices?.find(
        device => device.device_id === params.device_id,
    )
    if (device) {
        Object.assign(device, params)
    } else {
        user.devices.push(Device.fromJson({
            ...params,
            device_id: params.device_id,
        }))
    }
    await User.updateAndFetch(user.id, { devices: user.devices })
    return device
}

export const disableNotifications = async (userId: number, tokens: string[]): Promise<boolean> => {
    const user = await User.find(userId)
    if (!user) return false
    const device = user.devices?.find(device => device.token && tokens.includes(device.token))
    if (device) device.notifications_enabled = false
    await User.update(qb => qb.where('id', userId), {
        devices: user.devices,
    })
    return true
}
