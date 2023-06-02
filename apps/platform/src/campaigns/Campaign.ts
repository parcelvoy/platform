import Provider from '../providers/Provider'
import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
import List from '../lists/List'
import Template from '../render/Template'
import Subscription from '../subscriptions/Subscription'

export type CampaignState = 'draft' | 'scheduled' | 'pending' | 'running' | 'finished' | 'aborted'
export interface CampaignDelivery {
    sent: number
    total: number
    opens: number
    clicks: number
}

export type CampaignProgress = CampaignDelivery & { pending: number }

type CampaignType = 'blast' | 'trigger'

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

    send_in_user_timezone?: boolean
    send_at?: string | Date

    deleted_at?: Date

    static jsonAttributes = ['delivery', 'list_ids', 'exclusion_list_ids']
}

export type SentCampaign = Campaign & { send_at: Date }

export type CampaignParams = Omit<Campaign, ModelParams | 'delivery' | 'screenshotUrl' | 'templates' | 'lists' | 'exclusion_lists' | 'subscription' | 'provider' | 'deleted_at'>
export type CampaignCreateParams = Omit<CampaignParams, 'state'>
export type CampaignUpdateParams = Omit<CampaignParams, 'channel' | 'type'>

export type CampaignSendState = 'pending' | 'sent' | 'throttled' | 'failed' | 'bounced' | 'aborted'
export class CampaignSend extends Model {
    campaign_id!: number
    user_id!: number
    state!: CampaignSendState
    send_at!: string | Date
    opened_at!: string | Date
    clicks!: number
}

export type CampaignSendParams = Pick<CampaignSend, 'campaign_id' | 'user_id' | 'state' | 'send_at'>

export interface CampaignJobParams {
    id: number
    project_id: number
}
