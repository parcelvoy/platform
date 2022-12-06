import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
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
    channel!: ChannelType
    subscription_id!: number
    template_id!: number
    state!: CampaignState
    delivery!: CampaignDelivery
    send_at?: string | Date

    static jsonAttributes = ['delivery']
    static virtualAttributes = ['screenshotUrl']

    get screenshotUrl() {
        return templateScreenshotUrl(this.template_id)
    }
}

export type CampaignParams = Omit<Campaign, ModelParams | 'channel' | 'state' | 'delivery' | 'screenshotUrl'>
