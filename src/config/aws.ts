export interface AWSConfig {
    region: string
    credentials: AWSCredentials
}

export interface AWSCredentials {
    accessKey: string
    secretAccessKey: string
}