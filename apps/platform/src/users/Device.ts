import { ClientIdentity } from '../client/Client'
import Model, { ModelParams } from '../core/Model'

export class Device extends Model {
    project_id!: number
    user_id!: number
    device_id!: string
    token?: string | null
    os?: string
    os_version?: string
    model?: string
    app_build?: string
    app_version?: string
}

export type DeviceParams = Omit<Device, ModelParams | 'user_id'> & ClientIdentity

export type PushDevice = Device & { token: string }
