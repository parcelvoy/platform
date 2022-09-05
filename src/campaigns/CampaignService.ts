import { loadQueue } from '../config/queue'
import EmailJob from '../channels/email/EmailJob'
import TextJob from '../channels/text/TextJob'
import WebhookJob from '../channels/webhook/WebhookJob'
import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import Campaign from './Campaign'
import List, { UserList } from '../lists/List'

export const getCampaign = async (id: number): Promise<Campaign | undefined> => {
    return await Campaign.find(id)
}

export function sendCampaign(campaign: Campaign, user: User, event?: UserEvent): Promise<void>
export function sendCampaign(campaign: Campaign, userId: number, eventId?: number): Promise<void>
export async function sendCampaign(campaign: Campaign, user: User | number, event?: UserEvent | number): Promise<void> {

    const body = {
        campaign_id: campaign.id,
        user_id: user instanceof User ? user.id : user,
        event_id: event instanceof UserEvent ? event?.id : event,
    }

    const channels = {
        email: EmailJob.from(body),
        text: TextJob.from(body),
        webhook: WebhookJob.from(body),
    }

    const queue = await loadQueue(campaign.project_id)
    await queue.enqueue(channels[campaign.channel])
}

export const sendList = async (campaign: Campaign, list: List) => {

    // Stream results so that we aren't overwhelmed by millions
    // or potential entries
    await UserList.query()
        .where('list_id', list.id)
        .stream(async function(stream) {

            // For each result streamed back, process campaign send
            for await (const chunk of stream) {
                await sendCampaign(campaign, chunk.user_id)
            }
        })
}
