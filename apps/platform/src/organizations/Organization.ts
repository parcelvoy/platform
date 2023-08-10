import { AuthProviderConfig } from '../auth/Auth'
import Model, { ModelParams } from '../core/Model'

export interface TrackingOptions {
    linkWrap: boolean,
    deeplinkMirrorUrl: string | undefined,
}

export default class Organization extends Model {
    username!: string
    domain?: string
    auth!: AuthProviderConfig
    notification_provider_id?: number
    tracking_deeplink_mirror_url?: string

    static jsonAttributes = ['auth']
}

export type OrganizationParams = Omit<Organization, ModelParams | 'id' | 'auth' | 'notification_provider_id'>
