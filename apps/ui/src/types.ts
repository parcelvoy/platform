import { ComponentType, Dispatch, SetStateAction } from 'react'

export type Class<T> = new () => T

export interface ControlledProps<T> {
    value: T
    onChange: (value: T) => void
}

export type UseStateContext<T> = [T, Dispatch<SetStateAction<T>>]

export interface OAuthResponse {
    refresh_token: string
    access_token: string
    expires_at: Date
    refresh_expires_at: Date
}

export type Operator = '=' | '!=' | '<' | '<=' | '>' | '>=' | '=' | 'is set' | 'is not set' | 'or' | 'and' | 'xor' | 'empty' | 'contains' | 'any' | 'none'
export type RuleType = 'wrapper' | 'string' | 'number' | 'boolean' | 'date' | 'array'
export type RuleGroup = 'user' | 'event'

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap
export interface JsonMap { [key: string]: AnyJson }
export type JsonArray = AnyJson[]

export type Rule = {
    type: RuleType
    group: RuleGroup
    path: string
    operator: Operator
    value?: AnyJson
    children?: Rule[]
} & (
    | {
        type: 'wrapper'
        children: Rule[]
    }
    | { type: 'string' }
    | { type: 'number' }
    | { type: 'boolean' }
    | { type: 'date' }
    | { type: 'array' }
)

export type WrapperRule = Rule & { type: 'wrapper' }

export interface Preferences {
    readonly lang: string
    readonly mode: 'system' | 'light' | 'dark'
    readonly timeZone: string
}

export interface SearchParams {
    page: number
    itemsPerPage: number
    q: string
}

export interface SearchResult<T> {
    results: T[]
    start: number
    end: number
    total: number
    page: number
    itemsPerPage: number
    pages: number
}

export type AuditFields = 'created_at' | 'updated_at' | 'deleted_at'

export interface Admin {
    id: number
    first_name: string
    last_name: string
    email: string
}

export interface Project {
    id: number
    name: string
    description?: string
    locale: string
    timezone: string
    created_at: string
    updated_at: string
    deleted_at?: string
}

export type ChannelType = 'email' | 'push' | 'text' | 'webhook'

export type ProjectCreate = Omit<Project, 'id' | AuditFields>

export interface ProjectApiKey {
    id: number
    value: string
    name: string
    scope: 'public' | 'secret'
    description?: string
}

export type ProjectApiKeyParams = Pick<ProjectApiKey, 'name' | 'description' | 'scope'>

export interface User {
    id: number
    external_id: string
    full_name?: string
    email?: string
    phone?: string
    data: Record<string, any>
}

export interface UserEvent {
    id: number
    name: string
    data: Record<string, any>
}

export type ListState = 'ready' | 'loading'
type ListType = 'static' | 'dynamic'

export type List = {
    id: number
    projectId: number
    name: string
    state: ListState
    type: ListType
    rule?: WrapperRule
    users_count: number
    created_at: string
    updated_at: string
} & (
    | {
        type: 'dynamic'
        rule: WrapperRule
    }
    | { type: 'static' }
)

export type DynamicList = List & { type: 'dynamic' }

export type ListCreateParams = Pick<List, 'name' | 'rule' | 'type'>
export type ListUpdateParams = Pick<List, 'name' | 'rule'>

export interface Journey {
    id: number
    name: string
    description?: string
    created_at: string
    updated_at: string
}

export interface JourneyStep<T = any> {
    id: number
    type: string
    child_id?: number
    data: T
    x: number
    y: number
}

export type JourneyStepParams = Omit<JourneyStep, 'id'>

export type JourneyStepMap = Record<string, {
    type: string
    data?: Record<string, unknown>
    x: number
    y: number
    children?: Array<{
        uuid: string
        data?: Record<string, unknown>
    }>
}>

export interface JourneyStepTypeEditProps<T> extends ControlledProps<T> {
    journey: Journey
    project: Project
}

export interface JourneyStepTypeEdgeProps<T, E> extends ControlledProps<E> {
    stepData: T
    journey: Journey
    project: Project
}

export interface JourneyStepType<T = any, E = any> {
    name: string
    icon: string
    category: 'entrance' | 'delay' | 'flow' | 'action'
    description: string
    newData?: () => Promise<T>
    newEdgeData?: () => Promise<E>
    Edit?: ComponentType<JourneyStepTypeEditProps<T>>
    EditEdge?: ComponentType<JourneyStepTypeEdgeProps<T, E>>
}

export type CampaignState = 'draft' | 'scheduled' | 'running' | 'finished' | 'aborted'

export interface Campaign {
    id: number
    project_id: number
    name: string
    channel: ChannelType
    state: CampaignState
    delivery: {
        sent: number
        total: number
    }
    provider_id: number
    provider: Provider
    subscription_id?: number
    subscription: Subscription
    templates: Template[]
    list_id: number
    list?: List
    send_in_user_timezone: boolean
    send_at: string
    created_at: string
    updated_at: string
}

export type CampaignSendState = 'pending' | 'sent' | 'failed'

export type CampaignUpdateParams = Pick<Campaign, 'name' | 'list_id' | 'subscription_id'>
export type CampaignCreateParams = Pick<Campaign, 'name' | 'list_id' | 'channel' | 'subscription_id' | 'provider_id'>
export type CampaignLaunchParams = Pick<Campaign, 'send_at' | 'send_in_user_timezone'>
// export type ListUpdateParams = Pick<List, 'name' | 'rule'>
export type CampaignUser = User & { state: CampaignSendState, send_at: string }

export interface EmailTemplateData {
    from: string
    cc?: string
    bcc?: string
    reply_to?: string
    subject: string
    text: string
    html: string
}

export interface TextTemplateData {
    from: string
    text: string
}

export interface PushTemplateData {
    title: string
    topic: string
    body: string
    custom: Record<string, unknown>
}

export interface WebhookTemplateData {
    method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
    endpoint: string
    body: Record<string, any>
    headers: Record<string, string>
}

export type Template = {
    id: number
    campaign_id: number
    type: ChannelType
    locale: string
    data: any
    screenshot_url: string
    created_at: string
    updated_at: string
} & (
    | {
        type: 'email'
        data: EmailTemplateData
    }
    | {
        type: 'text'
        data: TextTemplateData
    }
    | {
        type: 'push'
        data: PushTemplateData
    }
    | {
        type: 'webhook'
        data: WebhookTemplateData
    }
)

export type TemplateCreateParams = Pick<Template, 'type' | 'data' | 'campaign_id' | 'locale'>
export type TemplateUpdateParams = Pick<Template, 'type' | 'data'>

export interface TemplatePreviewParams {
    user: Record<string, any>
    event: Record<string, any>
    ontext: Record<string, any>
}

export enum SubscriptionState {
    unsubscribed = 0,
    subscribed = 1,
    optedIn = 2,
}

export interface UserSubscription {
    id: number
    name: string
    channel: ChannelType
    subscription_id: number
    state: SubscriptionState
    created_at: string
    updated_at: string
}

export interface SubscriptionParams {
    state: SubscriptionState
    subscription_id: number
}

export interface Subscription {
    id: number
    name: string
    channel: ChannelType
    created_at: string
    updated_at: string
}

export type ProviderGroup = 'email' | 'text' | 'push' | 'webhook'
export interface Provider {
    id: number
    name: string
    type: string
    group: string
    data: any
}

export type ProviderCreateParams = Pick<Provider, 'name' | 'data' | 'type' | 'group'>
export type ProviderUpdateParams = ProviderCreateParams
export interface ProviderMeta {
    name: string
    description?: string
    url?: string
    icon?: string
    type: string
    channel: string
    schema: any
}
