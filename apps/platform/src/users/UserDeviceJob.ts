import { Job } from '../queue'
import { saveDevice } from './UserRepository'
import { DeviceParams } from './User'

type UserDeviceTrigger = DeviceParams & {
    project_id: number
}

export default class UserDeviceJob extends Job {
    static $name = 'user_register_device'

    static from(data: UserDeviceTrigger): UserDeviceJob {
        return new this(data)
    }

    static async handler({ project_id, ...device }: UserDeviceTrigger) {
        await saveDevice(project_id, device)
    }
}
