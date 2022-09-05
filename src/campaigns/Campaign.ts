import { ChannelType } from '../config/channels'
import Model from '../core/Model'

export default class Campaign extends Model {
    project_id!: number
    name!: string
    list_id!: number
    channel!: ChannelType
    template_id!: number
}

export type CampaignParams = Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'parseJson'>
