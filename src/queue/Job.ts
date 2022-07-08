interface JobOptions {
    delay: number
}

export interface EncodedJob {
    data: any
    options: JobOptions
    name: string
}

export default interface Job<T = any> extends EncodedJob {
    data: T
    handler: (data: T) => Promise<boolean>
}
