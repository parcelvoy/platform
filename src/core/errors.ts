export interface ErrorType {
    message: string
    code: number
    statusCode?: number
}

export class InternalError extends Error {

    readonly errorCode?: number
    readonly statusCode?: number
    constructor(error: ErrorType)
    constructor(message: string, statusCode?: number, errorCode?: number)
    constructor(
        message: string | ErrorType,
        statusCode?: number,
        errorCode?: number,
    ) {
        if (typeof message === 'string') {
            super(message)
            this.statusCode = statusCode
            this.errorCode = errorCode
        } else {
            super(message.message)
            this.statusCode = message.statusCode
            this.errorCode = message.code
        }
    }

    toJSON() {
        const body: { [key: string]: any } = {
            status: 'error',
            error: this.message || '',
        }
        if (this.errorCode) {
            body.code = this.errorCode
        }
        return body
    }
}

export class RequestError extends InternalError { }
