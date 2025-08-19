import { createNotification } from '../../notifications/NotificationService'
import { Variables } from '../../render'
import { InAppTemplate, PushTemplate } from '../../render/Template'
import { PushDevice } from '../../users/Device'
import { loadPushChannel } from '../push'

export default class InAppChannel {
    async send(template: InAppTemplate, devices: PushDevice[], variables: Variables) {
        const content = template.compile(variables)
        await createNotification(variables.user, content)

        const channel = await loadPushChannel(template.provider_id, variables.project.id)
        return await channel?.send(PushTemplate.fromJson({
            title: template.content.title,
            body: template.content.body,
            silent: true,
        }), devices, variables)
    }
}
