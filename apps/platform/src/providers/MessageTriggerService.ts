import { JourneyUserStep } from '../journey/JourneyStep'
import App from '../app'
import Campaign, { CampaignSend } from '../campaigns/Campaign'
import { updateSendState } from '../campaigns/CampaignService'
import { Channel } from '../config/channels'
import { RateLimitResponse } from '../config/rateLimit'
import { acquireLock } from '../core/Lock'
import Project from '../projects/Project'
import { EncodedJob } from '../queue'
import { RenderContext } from '../render'
import Template, { TemplateType } from '../render/Template'
import { templateInUserLocale } from '../render/TemplateService'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { randomInt } from '../utilities'
import { MessageTrigger } from './MessageTrigger'
import JourneyProcessJob from '../journey/JourneyProcessJob'
import { createEvent } from '../users/UserEventRepository'
import { loadUserStepDataMap } from '../journey/JourneyService'
import { getUserSubscriptionState } from '../subscriptions/SubscriptionService'
import { SubscriptionState } from '../subscriptions/Subscription'

interface MessageTriggerHydrated<T> {
    user: User
    event?: UserEvent
    journey: Record<string, unknown> // step.data_key -> user step data
    campaign: Campaign
    template: T
    project: Project
    context: RenderContext
}

export async function loadSendJob<T extends TemplateType>({ campaign_id, user_id, event_id, send_id, reference_type, reference_id }: MessageTrigger): Promise<MessageTriggerHydrated<T> | undefined> {

    const user = await User.find(user_id)
    const event = await UserEvent.find(event_id)
    const project = await Project.find(user?.project_id)
    const send = await CampaignSend.find(send_id)

    // If user or project is deleted, abort and discard job
    if (!user || !project) return

    // If there is a send and it's in an aborted state or has already
    // sent, abort this job to prevent duplicate sends
    if (send && send.hasCompleted) return

    // Fetch campaign
    const campaign = await Campaign.find(campaign_id)
    if (!campaign) return

    // Check to see if user has already unsubscribed or not
    const subscriptionState = await getUserSubscriptionState(user.id, campaign.subscription_id)
    if (subscriptionState === SubscriptionState.unsubscribed) {
        await updateSendState({
            campaign,
            user,
            reference_id,
            state: 'aborted',
        })
        return
    }

    // Get all templates
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
            reference_id,
            state: 'failed',
        })
        return
    }

    // Create context object from campaign details
    const context = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        campaign_type: campaign.type,
        template_id: template.id,
        channel: campaign.channel,
        subscription_id: campaign.subscription_id,
        reference_type,
        reference_id,
    }

    // Provide data captured from linked journey steps
    const journey: Record<string, unknown> = reference_id && reference_type === 'journey'
        ? await loadUserStepDataMap(reference_id)
        : {}

    // Create the hydrated message object
    const response = {
        campaign,
        context,
        event,
        journey,
        template: template.map() as T,
        project,
        user,
    }

    // Check that the template is valid and capable of being sent
    const [isValid, error] = template.map().validate()
    if (!isValid) {
        await failSend(response, error, () => false)
        return
    }

    return response
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
            reference_id: message.context.reference_id,
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

    // Only rate limit channels that have a provider
    if (!('provider' in channel)) return
    const provider = channel.provider

    // If no rate limit, just break
    if (!provider.rate_limit) return

    // Otherwise consume points and check rate
    return await App.main.rateLimiter.consume(
        `ratelimit-${provider.id}`,
        {
            limit: provider.rate_limit,
            points,
            msDuration: provider.interval,
        },
    )
}

export const failSend = async ({ campaign, user, context }: MessageTriggerHydrated<TemplateType>, error?: Error, shouldNotify = (_: any) => true) => {

    // Update send record
    await updateSendState({
        campaign,
        user,
        reference_id: context.reference_id,
        state: 'failed',
    })

    // Create an event on the failure
    await createEvent(user, {
        name: campaign.eventName('failed'),
        data: { ...context, error },
    }, true, ({ result, ...data }) => data)

    // If this send is part of a journey, notify the journey
    if (context.reference_id && context.reference_type === 'journey') {
        await notifyJourney(context.reference_id)
    }

    // Notify of the error if it's a critical one
    if (error && shouldNotify(error)) App.main.error.notify(error)
}

export const finalizeSend = async (data: MessageTriggerHydrated<TemplateType>, result: any) => {
    const { campaign, user, context } = data

    // Update send record
    await updateSendState({
        campaign,
        user,
        reference_id: context.reference_id,
    })

    // Create an event on the user about the send
    await createEvent(user, {
        name: campaign.eventName('sent'),
        data: { ...context, result },
    }, true, ({ result, ...data }) => data)

    // If this send is part of a journey, notify the journey
    if (context.reference_id && context.reference_type === 'journey') {
        await notifyJourney(context.reference_id, campaign.channel === 'webhook' ? result : undefined)
    }
}

export const notifyJourney = async (reference_id: string, response?: any) => {

    const referenceId = parseInt(reference_id, 10)

    // Save response into user step
    if (response) {
        await JourneyUserStep.update(q => q.where('id', referenceId), {
            data: {
                response,
            },
        })
    }

    // Trigger processing of this journey entrance
    await JourneyProcessJob.from({ entrance_id: referenceId }).queue()
}
