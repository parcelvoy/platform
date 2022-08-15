
export class RequestError extends Error {

    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message)
    }

}
