import App from '../app'
import Campaign, { CampaignSend } from '../campaigns/Campaign'
import { updateSendState } from '../campaigns/CampaignService'
import { RateLimitResponse } from '../config/rateLimit'
import Project from '../projects/Project'
import { EncodedJob } from '../queue'
import { RenderContext } from '../render'
import Template, { TemplateType } from '../render/Template'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { partialMatchLocale } from '../utilities'
import EmailChannel from './email/EmailChannel'
import { MessageTrigger } from './MessageTrigger'
import TextChannel from './text/TextChannel'

interface MessageTriggerHydrated<T> {
    user: User
    event?: UserEvent
    campaign: Campaign
    template: T
    project: Project
    context: RenderContext
}

export async function loadSendJob<T extends TemplateType>({ campaign_id, user_id, event_id, send_id }: MessageTrigger): Promise<MessageTriggerHydrated<T> | undefined> {

    const user = await User.find(user_id)
    const event = await UserEvent.find(event_id)
    const project = await Project.find(user?.project_id)
    const send = await CampaignSend.find(send_id)

    // If user or project is deleted, abort and discard job
    if (!user || !project) return

    // If there is a send and it's in an aborted state, abort
    if (send && send.state === 'aborted') return

    // Fetch campaign and templates
    const campaign = await Campaign.find(campaign_id)
    if (!campaign) return

    // Get all templates then filter for users best option
    const templates = await Template.all(
        qb => qb.where('campaign_id', campaign_id),
    )

    // Determine what template to send to the user based on the following:
    // - Find an exact match of users locale with a template
    // - Find a partial match (same root locale i.e. `en` vs `en-US`)
    // - If a project locale is set and there is match, use that template
    // - If there is a project locale and its a partial match, use
    // - Otherwise return any template available
    const template = templates.find(item => item.locale === user.locale)
        || templates.find(item => partialMatchLocale(item.locale, user.locale))
        || templates.find(item => item.locale === project.locale)
        || templates.find(item => partialMatchLocale(item.locale, project.locale))
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

export const throttleSend = async (channel: EmailChannel | TextChannel): Promise<RateLimitResponse | undefined> => {
    const provider = channel.provider

    // If no rate limit, just break
    if (!provider.rate_limit) return

    // Otherwise consume points and check rate
    return await App.main.rateLimiter.consume(
        `ratelimit-${provider.id}`,
        provider.rate_limit,
    )
}

export const requeueSend = async (job: EncodedJob, delay: number): Promise<void> => {
    job.options.delay = delay
    return App.main.queue.enqueue(job)
}
