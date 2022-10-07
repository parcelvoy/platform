import { User } from '../users/User'

export const getUserFromExternalId = async (projectId: number, externalId: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('external_id', externalId)
            .where('project_id', projectId),
    )
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
