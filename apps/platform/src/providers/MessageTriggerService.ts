import Campaign from '../campaigns/Campaign'
import { updateSendState } from '../campaigns/CampaignService'
import Project from '../projects/Project'
import { RenderContext } from '../render'
import Template, { TemplateType } from '../render/Template'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { MessageTrigger } from './MessageTrigger'

interface MessageTriggerHydrated<T> {
    user: User
    event?: UserEvent
    campaign: Campaign
    template: T
    project: Project
    context: RenderContext
}

export async function loadSendJob<T extends TemplateType>({ campaign_id, user_id, event_id }: MessageTrigger): Promise<MessageTriggerHydrated<T> | undefined> {

    const user = await User.find(user_id)
    const event = await UserEvent.find(event_id)
    const project = await Project.find(user?.project_id)

    // If user or project is deleted, abort and discard job
    if (!user || !project) return

    // Fetch campaign and templates
    const campaign = await Campaign.find(campaign_id)
    if (!campaign) return

    // Get all templates then filter for users best option
    const templates = await Template.all(
        qb => qb.where('campaign_id', campaign_id),
    )

    const template = templates.find(item => item.locale === user.locale)
        || templates.find(item => item.locale === project.locale)
        || templates[0]

    // If campaign or template dont exist, log and abort
    if (!template || !campaign) {
        await updateSendState(campaign, user, 'failed')
        return
    }

    const context = {
        campaign_id: campaign.id,
        template_id: template.id,
        subscription_id: campaign.subscription_id,
    }

    return { campaign, template: template.map() as T, user, project, event, context }
}
