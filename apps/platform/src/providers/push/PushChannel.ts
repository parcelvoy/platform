import { PushTemplate } from '../../render/Template'
import { Variables } from '../../render'
import { PushProvider } from './PushProvider'
import { PushResponse } from './Push'
import { PushDevice } from '../../users/Device'

export default class PushChannel {
    readonly provider: PushProvider
    constructor(provider?: PushProvider) {
        if (provider) {
            this.provider = provider
            this.provider.boot?.()
        } else {
            throw new Error('A valid push notification provider must be defined!')
        }
    }

    async send(template: PushTemplate, devices: PushDevice[], variables: Variables): Promise<PushResponse | undefined> {

        // Find tokens from active devices with push enabled
        // Temporarily include the old table
        const oldDevices = variables.user?.devices?.filter(device => device.token != null) as PushDevice[] ?? []
        const tokens: string[] = [...new Set([
            ...devices.map(device => device.token),
            ...oldDevices.map(device => device.token),
        ])]

        const push = {
            tokens,
            ...template.compile(variables),
        }

        // If no tokens, don't send
        if (tokens?.length <= 0) {
            return {
                push,
                success: false,
                response: 'No active devices with push enabled found.',
                invalidTokens: [],
                count: 0,
            }
        }

        return await this.provider.send(push)
    }
}
