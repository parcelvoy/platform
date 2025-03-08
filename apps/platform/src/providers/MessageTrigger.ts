export interface MessageTrigger {
    campaign_id: number
    user_id: number
    event_id?: number
    reference_type?: string
    reference_id?: string
}
