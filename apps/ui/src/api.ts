import Axios from 'axios'
import { env } from './config/env'
import { Admin, Campaign, CampaignCreateParams, CampaignLaunchParams, CampaignUpdateParams, CampaignUser, Image, Journey, JourneyStepMap, JourneyStepStats, List, ListCreateParams, ListUpdateParams, Project, ProjectAdmin, ProjectAdminParams, ProjectApiKey, ProjectApiKeyParams, Provider, ProviderCreateParams, ProviderMeta, ProviderUpdateParams, QueueMetric, SearchParams, SearchResult, Subscription, SubscriptionParams, Tag, Template, TemplateCreateParams, TemplatePreviewParams, TemplateProofParams, TemplateUpdateParams, User, UserEvent, UserSubscription } from './types'

function appendValue(params: URLSearchParams, name: string, value: unknown) {
    if (typeof value === 'undefined' || value === null || typeof value === 'function') return
    if (typeof value === 'object') value = JSON.stringify(value)
    params.append(name, value + '')
}

const client = Axios.create({
    ...env.api,
    paramsSerializer: params => {
        const s = new URLSearchParams()
        for (const [name, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                for (const item of value) {
                    appendValue(s, name, item)
                }
            } else {
                appendValue(s, name, value)
            }
        }
        return s.toString()
    },
})

client.interceptors.response.use(
    response => response,
    async error => {
        if (error.response.status === 401) {
            api.login()
        }
        throw error
    },
)

export interface NetworkError {
    response: {
        data: any
        status: number
    }
}

type OmitFields = 'id' | 'created_at' | 'updated_at' | 'deleted_at'

export interface EntityApi<T> {
    basePath: string
    search: (params: Partial<SearchParams>) => Promise<SearchResult<T>>
    create: (params: Omit<T, OmitFields>) => Promise<T>
    get: (id: number | string) => Promise<T>
    update: (id: number | string, params: Omit<T, OmitFields>) => Promise<T>
    delete: (id: number | string) => Promise<number>
}

function createEntityPath<T>(basePath: string): EntityApi<T> {
    return {
        basePath,
        search: async params => await client
            .get<SearchResult<T>>(basePath, { params })
            .then(r => r.data),
        create: async params => await client
            .post<T>(basePath, params)
            .then(r => r.data),
        get: async id => await client
            .get<T>(`${basePath}/${id}`)
            .then(r => r.data),
        update: async (id, params) => await client
            .patch<T>(`${basePath}/${id}`, params)
            .then(r => r.data),
        delete: async id => await client
            .delete<number>(`${basePath}/${id}`)
            .then(r => r.data),
    }
}

export interface ProjectEntityPath<T, C = Omit<T, OmitFields>, U = Omit<T, OmitFields>> {
    prefix: string
    search: (projectId: number | string, params: SearchParams) => Promise<SearchResult<T>>
    create: (projectId: number | string, params: C) => Promise<T>
    get: (projectId: number | string, id: number | string) => Promise<T>
    update: (projectId: number | string, id: number | string, params: U) => Promise<T>
    delete: (projectId: number | string, id: number | string) => Promise<number>
}

const projectUrl = (projectId: number | string) => `/admin/projects/${projectId}`

function createProjectEntityPath<T, C = Omit<T, OmitFields>, U = Omit<T, OmitFields>>(prefix: string): ProjectEntityPath<T, C, U> {
    return {
        prefix,
        search: async (projectId, params) => await client
            .get<SearchResult<T>>(`${projectUrl(projectId)}/${prefix}`, { params })
            .then(r => r.data),
        create: async (projectId, params) => await client
            .post<T>(`${projectUrl(projectId)}/${prefix}`, params)
            .then(r => r.data),
        get: async (projectId, entityId) => await client
            .get<T>(`${projectUrl(projectId)}/${prefix}/${entityId}`)
            .then(r => r.data),
        update: async (projectId, entityId, params) => await client
            .patch<T>(`${projectUrl(projectId)}/${prefix}/${entityId}`, params)
            .then(r => r.data),
        delete: async (projectId, entityId) => await client
            .delete<number>(`${projectUrl(projectId)}/${prefix}/${entityId}`)
            .then(r => r.data),
    }
}

const cache: {
    profile: null | Admin
} = {
    profile: null,
}

const api = {

    login() {
        window.location.href = `/login?r=${encodeURIComponent(window.location.href)}`
    },

    async logout() {
        window.location.href = env.api.baseURL + '/auth/logout'
    },

    async basicAuth(email: string, password: string, redirect: string = '/') {
        await client.post('/auth/login/callback', { email, password })
        window.location.href = redirect
    },

    profile: {
        get: async () => {
            if (!cache.profile) {
                cache.profile = await client.get<Admin>('/admin/profile').then(r => r.data)
            }
            return cache.profile!
        },
    },

    admins: createEntityPath<Admin>('/admin/admins'),

    projects: {
        ...createEntityPath<Project>('/admin/projects'),
        all: async () => await client
            .get<Project[]>('/admin/projects/all')
            .then(r => r.data),
    },

    apiKeys: createProjectEntityPath<ProjectApiKey, ProjectApiKeyParams, Omit<ProjectApiKeyParams, 'scope'>>('keys'),

    campaigns: {
        ...createProjectEntityPath<Campaign, CampaignCreateParams, CampaignUpdateParams | CampaignLaunchParams>('campaigns'),
        users: async (projectId: number | string, campaignId: number | string, params: SearchParams) => await client
            .get<SearchResult<CampaignUser>>(`${projectUrl(projectId)}/campaigns/${campaignId}/users`, { params })
            .then(r => r.data),
        duplicate: async (projectId: number | string, campaignId: number | string) => await client
            .post<Campaign>(`${projectUrl(projectId)}/campaigns/${campaignId}/duplicate`)
            .then(r => r.data),
    },

    journeys: {
        ...createProjectEntityPath<Journey>('journeys'),
        steps: {
            get: async (projectId: number | string, journeyId: number | string) => await client
                .get<JourneyStepMap>(`/admin/projects/${projectId}/journeys/${journeyId}/steps`)
                .then(r => r.data),
            set: async (projectId: number | string, journeyId: number | string, stepData: JourneyStepMap) => await client
                .put<JourneyStepMap>(`/admin/projects/${projectId}/journeys/${journeyId}/steps`, stepData)
                .then(r => r.data),
            stats: async (projectId: number | string, journeyId: number | string) => await client
                .get<JourneyStepStats>(`/admin/projects/${projectId}/journeys/${journeyId}/step-stats`)
                .then(r => r.data),
        },
    },

    templates: {
        ...createProjectEntityPath<Template, TemplateCreateParams, TemplateUpdateParams>('templates'),
        preview: async (projectId: number | string, templateId: number | string, params: TemplatePreviewParams) => await client.post(`${projectUrl(projectId)}/templates/${templateId}/preview`, params),
        proof: async (projectId: number | string, templateId: number | string, params: TemplateProofParams) => await client.post(`${projectUrl(projectId)}/templates/${templateId}/proof`, params),
    },

    users: {
        ...createProjectEntityPath<User>('users'),
        lists: async (projectId: number | string, userId: number | string, params: SearchParams) => await client
            .get<SearchResult<List>>(`${projectUrl(projectId)}/users/${userId}/lists`, { params })
            .then(r => r.data),
        events: async (projectId: number | string, userId: number | string, params: SearchParams) => await client
            .get<SearchResult<UserEvent>>(`${projectUrl(projectId)}/users/${userId}/events`, { params })
            .then(r => r.data),
        subscriptions: async (projectId: number | string, userId: number | string, params: SearchParams) => await client
            .get<SearchResult<UserSubscription>>(`${projectUrl(projectId)}/users/${userId}/subscriptions`, { params })
            .then(r => r.data),
        updateSubscriptions: async (projectId: number | string, userId: number | string, subscriptions: SubscriptionParams[]) => await client
            .patch(`${projectUrl(projectId)}/users/${userId}/subscriptions`, subscriptions)
            .then(r => r.data),
    },

    lists: {
        ...createProjectEntityPath<List, ListCreateParams, ListUpdateParams>('lists'),
        users: async (projectId: number | string, listId: number | string, params: SearchParams) => await client
            .get<SearchResult<User>>(`${projectUrl(projectId)}/lists/${listId}/users`, { params })
            .then(r => r.data),
        upload: async (projectId: number | string, listId: number | string, file: File) => {
            const formData = new FormData()
            formData.append('file', file)
            await client.post(`${projectUrl(projectId)}/lists/${listId}/users`, formData)
        },
    },

    projectAdmins: {
        search: async (projectId: number, params: SearchParams) => await client
            .get<SearchResult<ProjectAdmin>>(`${projectUrl(projectId)}/admins`, { params })
            .then(r => r.data),
        add: async (projectId: number, adminId: number, params: ProjectAdminParams) => await client
            .put<ProjectAdmin>(`${projectUrl(projectId)}/admins/${adminId}`, params)
            .then(r => r.data),
        get: async (projectId: number, adminId: number) => await client
            .get<ProjectAdmin>(`${projectUrl(projectId)}/admins/${adminId}`)
            .then(r => r.data),
        remove: async (projectId: number, adminId: number) => await client
            .delete(`${projectUrl(projectId)}/admins/${adminId}`)
            .then(r => r.data),
    },

    subscriptions: createProjectEntityPath<Subscription>('subscriptions'),

    providers: {
        all: async (projectId: number | string) => await client
            .get<Provider[]>(`${projectUrl(projectId)}/providers/all`)
            .then(r => r.data),
        search: async (projectId: number | string, params: any) => await client
            .get<SearchResult<Provider>>(`${projectUrl(projectId)}/providers`, { params })
            .then(r => r.data),
        options: async (projectId: number | string) => await client
            .get<ProviderMeta[]>(`${projectUrl(projectId)}/providers/meta`)
            .then(r => r.data),
        create: async (projectId: number | string, { group, type, ...provider }: ProviderCreateParams) => await client
            .post<Provider>(`${projectUrl(projectId)}/providers/${group}/${type}`, provider)
            .then(r => r.data),
        update: async (projectId: number | string, entityId: number | string, { group, type, ...provider }: ProviderUpdateParams) => await client
            .patch<Provider>(`${projectUrl(projectId)}/providers/${group}/${type}/${entityId}`, provider)
            .then(r => r.data),
    },

    images: {
        ...createProjectEntityPath<Image>('images'),
        create: async (projectId: number | string, image: File) => {
            const formData = new FormData()
            formData.append('image', image)
            await client.post(`${projectUrl(projectId)}/images`, formData)
        },
    },

    tags: {
        ...createProjectEntityPath<Tag>('tags'),
        used: async (projectId: number | string, entity: string) => await client
            .get<Tag[]>(`${projectUrl(projectId)}/tags/used/${entity}`)
            .then(r => r.data),
        assign: async (projectId: number | string, entity: string, entityId: number, tags: string[]) => await client
            .put<string[]>(`${projectUrl(projectId)}/tags/assign`, { entity, entityId, tags })
            .then(r => r.data),
        all: async (projectId: number | string) => await client
            .get<Tag[]>(`${projectUrl(projectId)}/tags/all`)
            .then(r => r.data),
    },

    organizations: {
        metrics: async () => await client
            .get<QueueMetric>('/admin/organizations/metrics')
            .then(r => r.data),
    },
}

export default api;

(window as any).API = api
