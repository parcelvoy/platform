import type { User } from '../users/User'

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]

export type ClientIdentityKeys = {
    anonymous_id: string
    external_id: string
}

export type ClientIdentity = RequireAtLeastOne<ClientIdentityKeys, 'anonymous_id' | 'external_id'>

export type ClientAliasParams = ClientIdentity & {
    previous_id?: string
}

export type ClientIdentifyParams = Partial<Pick<User, 'email' | 'phone' | 'timezone' | 'locale' | 'data'>> & ClientIdentity

export type ClientIdentifyUser = Pick<User, 'external_id'> & Partial<Pick<User, 'email' | 'phone' | 'data'>>

export type ClientPatchUsersRequest = ClientIdentifyUser[]

export type ClientDeleteUsersRequest = string[]

export type ClientPostEvent = {
    name: string
    data?: Record<string, unknown>
    user?: ClientIdentifyParams
    created_at?: Date
} & ClientIdentity

export type ClientPostEventsRequest = ClientPostEvent[]

export interface SegmentContext {
    app?: {
        build: string
        name: string
        namespace: string
        version: string
    }
    ip?: number
    os: {
        name: string
        version: string
    }
    locale: string
    timezone?: string
}

// https://segment.com/docs/connections/spec/common/
export type SegmentPostEvent = {
    event: string
    anonymousId: string
    userId: string
    previousId?: string
    context: Record<string, any> & SegmentContext
    properties: Record<string, any>
    traits?: Record<string, any>
    type: 'track' | 'alias' | 'identify'
    timestamp: string
} & (
    {
        type: 'track',
        properties: Record<string, any>
    }
    | {
        type: 'identify' | 'alias'
        traits: Record<string, any>
    }
)

export type SegmentPostEventsRequest = SegmentPostEvent[]
