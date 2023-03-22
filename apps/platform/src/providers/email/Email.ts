export interface Email {
    to: string
    from: string
    cc?: string
    bcc?: string
    reply_to?: string
    subject: string
    text: string
    html: string
    headers?: Record<string, any>
}
