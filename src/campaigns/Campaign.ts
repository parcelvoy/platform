import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
import List from '../lists/List'
import Template from '../render/Template'

type CampaignState = 'ready' | 'running' | 'finished' | 'aborted'
interface CampaignDelivery {
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
    provider_id!: number
    templates!: Template[]
    state!: CampaignState
    delivery!: CampaignDelivery

    send_in_user_timezone?: boolean
    send_at?: string | Date

    static jsonAttributes = ['delivery']
}

export type SentCampaign = Campaign & { send_at: Date }

export type CampaignParams = Omit<Campaign, ModelParams | 'channel' | 'state' | 'delivery' | 'screenshotUrl' | 'templates' | 'list'>

export type CampaignSendState = 'pending' | 'sent' | 'failed'
export class CampaignSend extends Model {
    campaign_id!: number
    user_id!: number
    state!: CampaignSendState
    send_at!: string | Date
}

export type CampaignSendParams = Pick<CampaignSend, 'campaign_id' | 'user_id' | 'state' | 'send_at'>
