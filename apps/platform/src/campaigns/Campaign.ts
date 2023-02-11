import Provider from '../channels/Provider'
import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
import List from '../lists/List'
import Template from '../render/Template'
import Subscription from '../subscriptions/Subscription'

export type CampaignState = 'draft' | 'scheduled' | 'running' | 'finished' | 'aborted'
export interface CampaignDelivery {
    sent: number
    total: number
}

export default class Campaign extends Model {
    project_id!: number
    name!: string
    list_id?: number
    list?: List
    channel!: ChannelType
    subscription_id!: number
    subscription?: Subscription
    provider_id!: number
    provider?: Provider
    templates!: Template[]
    state!: CampaignState
    delivery!: CampaignDelivery

    send_in_user_timezone?: boolean
    send_at?: string | Date

    deleted_at?: Date

    static jsonAttributes = ['delivery']
}

export type SentCampaign = Campaign & { send_at: Date }

export type CampaignParams = Omit<Campaign, ModelParams | 'state' | 'delivery' | 'screenshotUrl' | 'templates' | 'list' | 'subscription' | 'provider' | 'deleted_at'>
export type CampaignUpdateParams = Omit<CampaignParams, 'channel'>

export type CampaignSendState = 'pending' | 'sent' | 'failed'
export class CampaignSend extends Model {
    campaign_id!: number
    user_id!: number
    state!: CampaignSendState
    send_at!: string | Date
}

export type CampaignSendParams = Pick<CampaignSend, 'campaign_id' | 'user_id' | 'state' | 'send_at'>
