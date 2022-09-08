import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'

export default class Campaign extends Model {
    project_id!: number
    name!: string
    list_id?: number
    channel!: ChannelType
    subscription_id!: number
    template_id!: number
}

export type CampaignParams = Omit<Campaign, ModelParams | 'channel'>
