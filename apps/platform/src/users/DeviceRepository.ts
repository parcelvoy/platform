import { Transaction } from '../core/Model'
import { Device, PushDevice } from './Device'

export const getDeviceFromIdOrToken = async (projectId: number, deviceId: string, token: string | null | undefined, trx?: Transaction): Promise<Device | undefined> => {
    if (!deviceId && !token) return undefined
    return await Device.first(qb => qb.where('project_id', projectId)
        .where(sqb => {
            if (deviceId) {
                sqb.where('device_id', deviceId)
            }
            if (token) {
                sqb.orWhere('token', token)
            }
            return sqb
        }), trx)
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
