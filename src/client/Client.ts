import type { User } from './User'

export type ClientPatchUser = Pick<User, 'external_id'> & Partial<Pick<User, 'email' | 'phone' | 'data'>>

export type ClientPatchUsersRequest = ClientPatchUser[]

export type ClientDeleteUsersRequest = string[]

export type ClientPostEvent = {
    name: string
    user_id: string
    data?: Record<string, unknown>
}

export type ClientPostEventsRequest = ClientPostEvent[]
