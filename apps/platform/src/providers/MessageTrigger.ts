export interface MessageTrigger {
    send_id?: number
    campaign_id: number
    user_id: number
    event_id?: number
    reference_type?: string
    reference_id?: string
}
