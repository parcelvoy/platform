export default class PushError extends Error {
    invalidTokens: string[]
    constructor(provider: string, message: string | undefined, invalidTokens: string[]) {
        super(`Push Error: ${provider}: ${message}`)
        this.invalidTokens = invalidTokens
        Error.captureStackTrace(this, PushError)
    }
}
