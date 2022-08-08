export default class TextError extends Error {
    constructor(type: string, message: string) {
        super(`Text Error: ${type}: ${message}`)
        Error.captureStackTrace(this, TextError)
    }
}
