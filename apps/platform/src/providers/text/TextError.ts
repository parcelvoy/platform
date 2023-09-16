export default class TextError extends Error {
    phone: string
    constructor(type: string, phone: string, message: string) {
        super(`Text Error: ${type}: ${message}`)
        this.phone = phone
        Error.captureStackTrace(this, TextError)
    }
}

export class UnsubscribeTextError extends TextError { }

export class UndeliverableTextError extends TextError { }

export class RateLimitTextError extends TextError { }
