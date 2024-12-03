export interface Push {
    tokens: string | string[]
    topic: string
    title: string
    body: string
    custom: Record<string, string | number>
}

export interface PushResponse {
    push: Push
    success: boolean
    response?: string
    invalidTokens: string[]
}
