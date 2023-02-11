export interface AWSConfig {
    region: string
    credentials: AWSCredentials
}

export interface AWSCredentials {
    accessKeyId: string
    secretAccessKey: string
}
