export interface TextMessage {
    to: string
    from: string
    text: string
}

export interface TextResponse {
    message: TextMessage
    success: boolean
    response: string
}
