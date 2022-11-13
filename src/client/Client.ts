import type { User } from '../users/User'

export interface AnonymousClientIdentity {
    anonymous_id: string
    external_id?: string
}

export interface IdentifiedClientIdentity {
    anonymous_id?: string
    external_id: string
}

export type ClientIdentity = AnonymousClientIdentity | IdentifiedClientIdentity

export type ClientAliasParams = ClientIdentity

export type ClientIdentifyParams = Partial<Pick<User, 'email' | 'phone' | 'data'>> & ClientIdentity

export type ClientIdentifyUser = Pick<User, 'external_id'> & Partial<Pick<User, 'email' | 'phone' | 'data'>>

export type ClientPatchUsersRequest = ClientIdentifyUser[]

export type ClientDeleteUsersRequest = string[]

export type ClientPostEvent = {
    name: string
    data?: Record<string, unknown>
} & ClientIdentity

export type ClientPostEventsRequest = ClientPostEvent[]
