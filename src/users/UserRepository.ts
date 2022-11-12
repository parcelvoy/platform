import { ClientAliasParams, ClientIdentifyParams } from '../client/Client'
import { Device, DeviceParams, User } from '../users/User'
import { uuid } from '../utilities'

export const getUser = async (id: number): Promise<User | undefined> => {
    return await User.find(id)
}

export const getUserFromClientId = async (projectId: number, id: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where(
            sqb => sqb.where('external_id', id)
                .orWhere('uuid', id),
        ).where('project_id', projectId),
    )
}

export const getUserFromPhone = async (projectId: number, phone: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('phone', phone)
            .where('project_id', projectId),
    )
}

export const createUser = async (params: ClientIdentifyParams) => {
    return await User.insertAndFetch(params)
}

export const aliasUser = async (projectId: number, alias: ClientAliasParams): Promise<User | undefined> => {
    const user = await getUserFromClientId(projectId, alias.anonymous_id)
    if (!user) return
    return await User.updateAndFetch(user.id, { external_id: alias.external_id })
}

export const saveDevice = async (user: User, { user_id, ...params }: DeviceParams): Promise<Device> => {
    let device = user.devices.find(
        device => device.external_id === params.external_id,
    )
    if (device) {
        Object.assign(device, params)
    } else {
        device = Device.fromJson({
            ...params,
            external_id: uuid(),
        })
    }
    await User.updateAndFetch(user.id, { devices: user.devices })
    return device
}

export const disableNotifications = async (userId: number, tokens: string[]): Promise<boolean> => {
    const user = await User.find(userId)
    if (!user) return false
    const device = user.devices.find(device => device.token && tokens.includes(device.token))
    if (device) device.notifications_enabled = false
    await User.update(qb => qb.where('id', userId), {
        devices: user.devices,
    })
    return true
}
