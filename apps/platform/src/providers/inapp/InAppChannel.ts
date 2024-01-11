import { createNotification } from '../../notifications/NotificationService'
import { Variables } from '../../render'
import { InAppTemplate, PushTemplate } from '../../render/Template'
import { loadPushChannel } from '../push'

export default class InAppChannel {
    async send(template: InAppTemplate, variables: Variables) {
        const content = template.compile(variables)
        await createNotification(variables.user, content)

        const channel = await loadPushChannel(template.provider_id, variables.project.id)
        await channel?.send(PushTemplate.fromJson({
            title: template.content.title,
            body: template.content.body,
            topic: 'in_app',
            silent: true,
        }), variables)
    }
}
