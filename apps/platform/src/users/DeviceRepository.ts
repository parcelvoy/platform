import { Transaction } from '../core/Model'
import { Device, PushDevice } from './Device'

export const getDeviceFromIdOrToken = async (projectId: number, deviceId: string, token: string | null | undefined, trx?: Transaction): Promise<Device | undefined> => {
    if (!deviceId && !token) return undefined
    if (deviceId) {
        const device = await Device.first(qb => qb.where('project_id', projectId).where('device_id', deviceId), trx)
        if (device) return device
    }
    if (token) {
        const device = await Device.first(qb => qb.where('project_id', projectId).where('token', token), trx)
        if (device) return device
    }
}

export const markDevicesAsPushDisabled = async (projectId: number, tokens: string[], trx?: Transaction): Promise<void> => {
    await Device.update(qb => qb.whereIn('token', tokens).where('project_id', projectId), { token: null }, trx)
}

export const userHasPushDevice = async (projectId: number, userId: number, trx?: Transaction): Promise<boolean> => {
    return await Device.exists(qb =>
        qb.where('project_id', projectId)
            .where('user_id', userId)
            .whereNotNull('token'),
    trx,
    )
}

export const getPushDevicesForUser = async (projectId: number, userId: number, trx?: Transaction): Promise<PushDevice[]> => {
    return await Device.all(qb => qb.where('project_id', projectId)
        .where('user_id', userId)
        .whereNotNull('token'), trx) as PushDevice[]
}
