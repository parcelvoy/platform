import App from '../app'
import Campaign, { CampaignSend } from '../campaigns/Campaign'
import { updateSendState } from '../campaigns/CampaignService'
import { Channel } from '../config/channels'
import { RateLimitResponse } from '../config/rateLimit'
import { acquireLock } from '../config/scheduler'
import Project from '../projects/Project'
import { EncodedJob } from '../queue'
import { RenderContext } from '../render'
import Template, { TemplateType } from '../render/Template'
import { templateInUserLocale } from '../render/TemplateService'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { randomInt } from '../utilities'
import { MessageTrigger } from './MessageTrigger'

interface MessageTriggerHydrated<T> {
    user: User
    event?: UserEvent
    campaign: Campaign
    template: T
    project: Project
    context: RenderContext
}

export async function loadSendJob<T extends TemplateType>({ campaign_id, user_id, event_id, send_id, user_step_id }: MessageTrigger): Promise<MessageTriggerHydrated<T> | undefined> {

    const user = await User.find(user_id)
    const event = await UserEvent.find(event_id)
    const project = await Project.find(user?.project_id)
    const send = await CampaignSend.find(send_id)

    // If user or project is deleted, abort and discard job
    if (!user || !project) return

    // If there is a send and it's in an aborted state or has already
    // sent, abort this job to prevent duplicate sends
    if (send && (send.state === 'aborted' || send.state === 'sent')) return

    // Fetch campaign and templates
    const campaign = await Campaign.find(campaign_id)
    if (!campaign) return

    // Get all templates then filter for users best option
    const templates = await Template.all(
        qb => qb.where('campaign_id', campaign_id),
    )

    // Determine what template to send to the user based on the following
    const template = templateInUserLocale(templates, project, user)

    // If campaign or template dont exist, log and abort
    if (!template || !campaign) {
        await updateSendState({
            campaign,
            user,
            user_step_id,
            state: 'failed',
        })
        return
    }

    const context = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        campaign_type: campaign.type,
        template_id: template.id,
        channel: campaign.channel,
        subscription_id: campaign.subscription_id,
        user_step_id,
    }

    return { campaign, template: template.map() as T, user, project, event, context }
}

export const messageLock = (campaign: Campaign, user: User) => `parcelvoy:send:${campaign.id}:${user.id}`

export const prepareSend = async <T>(
    channel: Channel,
    message: MessageTriggerHydrated<T>,
    raw: EncodedJob,
    rateLimitPoints = 1,
): Promise<boolean | undefined> => {
    const { campaign, user } = message

    // Check current send rate, if exceeded then requeue job
    // at a time in the future
    const rateCheck = await throttleSend(channel, rateLimitPoints)
    if (rateCheck?.exceeded) {

        // Mark state as throttled so it is not continuously added
        // to the queue
        await updateSendState({
            campaign,
            user,
            user_step_id: message.context.user_step_id,
            state: 'throttled',
        })

        // Schedule the resend for a jittered number of seconds later
        const delay = 1000 + randomInt(0, 5000)
        await App.main.queue.delay(raw, delay)
        return false
    }

    // Create a lock for this process to make sure it doesn't run twice
    const acquired = await acquireLock({ key: messageLock(campaign, user) })
    if (!acquired) return false

    return true
}

export const throttleSend = async (channel: Channel, points = 1): Promise<RateLimitResponse | undefined> => {
    const provider = channel.provider

    // If no rate limit, just break
    if (!provider.rate_limit) return

    // Otherwise consume points and check rate
    return await App.main.rateLimiter.consume(
        `ratelimit-${provider.id}`,
        {
            limit: provider.rate_limit,
            points,
        },
    )
}
