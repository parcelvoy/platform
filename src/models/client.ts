import type { User } from "./User"

export type ClientPatchUsersRequest = Array<Pick<User, 'external_id'> & Partial<Pick<User, 'email' | 'phone' | 'data'>>>

export type ClientDeleteUsersRequest = string[]

export type ClientPostEventsRequest = Array<{
    name: string
    user_id: string
    data?: Record<string, any>
}>
