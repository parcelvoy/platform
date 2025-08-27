import { createNotification } from '../../notifications/NotificationService'
import { Variables } from '../../render'
import { InAppTemplate, PushTemplate } from '../../render/Template'
import { PushDevice } from '../../users/Device'
import PushChannel from '../push/PushChannel'

export default class InAppChannel {
    readonly pushChannel: PushChannel
    constructor(pushChannel: PushChannel) {
        if (pushChannel) {
            this.pushChannel = pushChannel
        } else {
            throw new Error('A valid push notification provider must be defined!')
        }
    }

    async send(template: InAppTemplate, devices: PushDevice[], variables: Variables) {
        const content = template.compile(variables)
        await createNotification(variables.user, content)

        return await this.pushChannel.send(PushTemplate.fromJson({
            data: {
                title: template.content.title,
                body: template.content.body,
                silent: true,
            },
        }), devices, variables)
    }
}
