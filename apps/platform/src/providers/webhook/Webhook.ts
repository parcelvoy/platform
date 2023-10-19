export interface Webhook {
    method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
    endpoint: string
    headers: Record<string, string>
    body?: Record<string, any>
}

export interface WebhookResponse {
    message: Webhook
    success: boolean
    response: Record<string, any> | string
}
