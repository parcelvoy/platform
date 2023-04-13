import { PushTemplate } from '../../render/Template'
import { Variables } from '../../render'
import { PushProvider } from './PushProvider'

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

    async send(template: PushTemplate, variables: Variables) {

        // Find tokens from active devices with push enabled
        const tokens = variables.user.pushEnabledDevices.map(device => device.token)

        // If no tokens, don't send
        if (tokens?.length <= 0) return

        const push = {
            tokens,
            ...template.compile(variables),
        }

        await this.provider.send(push)
    }
}
