export interface Email {
    from: string
    to: string
    subject: string
    html: string
    text: string
    cc?: string
    bcc?: string
    replyTo?: string
}
