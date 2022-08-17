export interface Email {
    to: string
    from: string
    cc?: string
    bcc?: string
    reply_to?: string
    subject: string
    text_body: string
    html_body: string
}
