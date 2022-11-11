import type { User } from '../users/User'

export interface ClientAliasParams {
    anonymous_id: string
    external_id: string
}

export type ClientIdentifyParams = Partial<Pick<User, 'external_id' | 'email' | 'phone' | 'data'>>

export type ClientIdentifyUser = Pick<User, 'external_id'> & Partial<Pick<User, 'email' | 'phone' | 'data'>>

export type ClientPatchUsersRequest = ClientIdentifyUser[]

export type ClientDeleteUsersRequest = string[]

export type ClientPostEvent = {
    name: string
    user_id: string
    data?: Record<string, unknown>
}

export type ClientPostEventsRequest = ClientPostEvent[]
