export type NamedEmail = { name: string, address: string }

export interface Email {
    to: string
    from: string | NamedEmail
    cc?: string
    bcc?: string
    reply_to?: string
    subject: string
    text: string
    html: string
    headers?: Record<string, any>
    list?: { unsubscribe: string }
}
