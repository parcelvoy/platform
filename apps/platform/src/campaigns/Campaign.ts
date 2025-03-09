import Provider from '../providers/Provider'
import { ChannelType } from '../config/channels'
import Model, { BaseModel, ModelParams } from '../core/Model'
import List from '../lists/List'
import Template from '../render/Template'
import Subscription from '../subscriptions/Subscription'
import { crossTimezoneCopy } from '../utilities'
import Project from '../projects/Project'
import { User } from '../users/User'

export type CampaignState = 'draft' | 'scheduled' | 'loading' | 'running' | 'finished' | 'aborting' | 'aborted'
export interface CampaignDelivery {
    sent: number
    total: number
    opens: number
    clicks: number
}

export type CampaignProgress = CampaignDelivery & { pending: number }

export type CampaignType = 'blast' | 'trigger'

export default class Campaign extends Model {
    project_id!: number
    type!: CampaignType
    name!: string
    list_ids?: number[]
    lists?: List[]
    exclusion_list_ids?: number[]
    exclusion_lists?: List[]
    channel!: ChannelType
    subscription_id!: number
    subscription?: Subscription
    provider_id!: number
    provider?: Provider
    templates!: Template[]
    state!: CampaignState
    delivery!: CampaignDelivery
    tags?: string[]
    progress?: CampaignPopulationProgress

    send_in_user_timezone?: boolean
    send_at?: string | Date | null

    deleted_at?: Date

    static jsonAttributes = ['delivery', 'list_ids', 'exclusion_list_ids']

    eventName(action: string) {
        return `${this.channel}_${action}`
    }
}

export type CampaignPopulationProgress = {
    complete: number
    total: number
}

export type SentCampaign = Campaign & { send_at: Date }

export type CampaignParams = Omit<Campaign, ModelParams | 'delivery' | 'eventName' | 'templates' | 'lists' | 'exclusion_lists' | 'subscription' | 'provider' | 'deleted_at' | 'progress'>
export type CampaignCreateParams = Omit<CampaignParams, 'state'>
export type CampaignUpdateParams = Omit<CampaignParams, 'channel' | 'type'>

export type CampaignSendState = 'pending' | 'sent' | 'throttled' | 'failed' | 'bounced' | 'aborted'
export type CampaignSendReferenceType = 'journey' | 'trigger'
export class CampaignSend extends BaseModel {
    campaign_id!: number
    user_id!: number
    state!: CampaignSendState
    send_at!: string | Date
    opened_at!: string | Date
    clicks!: number
    reference_type?: CampaignSendReferenceType
    reference_id?: string

    get hasCompleted() {
        return ['aborted', 'sent', 'failed', 'bounced'].includes(this.state)
    }

    static create(
        campaign: SentCampaign,
        project: Pick<Project, 'timezone'>,
        user: Pick<User, 'id' | 'timezone'>,
    ): CampaignSendParams {
        return {
            user_id: user.id,
            campaign_id: campaign.id,
            state: 'pending',
            send_at: campaign.send_in_user_timezone
                ? crossTimezoneCopy(
                    campaign.send_at,
                    project.timezone,
                    user.timezone ?? project.timezone,
                )
                : campaign.send_at,
        }
    }
}

export type CampaignSendParams = Pick<CampaignSend, 'campaign_id' | 'user_id' | 'state' | 'send_at'>

export interface CampaignJobParams {
    id: number
    project_id: number
}
