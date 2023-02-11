export interface TextMessage {
    to: string
    text: string
}

export interface InboundTextMessage extends TextMessage {
    from: string
}

export interface TextResponse {
    message: TextMessage
    success: boolean
    response: string
}
