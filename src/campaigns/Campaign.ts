import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
import List from '../lists/List'
import Template from '../render/Template'
import { templateScreenshotUrl } from '../render/TemplateService'

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
    template_id!: number
    template?: Template
    state!: CampaignState
    delivery!: CampaignDelivery

    send_in_user_timezone!: boolean
    send_at?: string | Date
    send_finished_at?: string | Date

    static jsonAttributes = ['delivery']
    static virtualAttributes = ['screenshotUrl']

    get screenshotUrl() {
        return templateScreenshotUrl(this.template_id)
    }
}

export type SentCampaign = Campaign & { send_at: Date }

export type CampaignParams = Omit<Campaign, ModelParams | 'channel' | 'state' | 'delivery' | 'screenshotUrl' | 'template' | 'list'>

export type CampaignSendStatus = 'pending' | 'sent' | 'failed'
export class CampaignSend extends Model {
    campaign_id!: number
    user_id!: number
    state!: CampaignSendStatus
    send_at!: string | Date
}

export type CampaignSendParams = Pick<CampaignSend, 'campaign_id' | 'user_id' | 'state' | 'send_at'>
