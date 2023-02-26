import Axios from 'axios'
import { env } from './config/env'
import { Admin, Campaign, CampaignCreateParams, CampaignLaunchParams, CampaignUpdateParams, CampaignUser, Image, Journey, JourneyStepMap, JourneyStepStats, List, ListCreateParams, ListUpdateParams, Project, ProjectAdminCreateParams, ProjectApiKey, Provider, ProviderCreateParams, ProviderMeta, ProviderUpdateParams, SearchParams, SearchResult, Subscription, SubscriptionParams, Template, TemplateCreateParams, TemplatePreviewParams, TemplateUpdateParams, User, UserEvent, UserSubscription } from './types'

const client = Axios.create(env.api)

client.interceptors.response.use(
    response => response,
    async error => {
        if (error.response.status === 401) {
            api.login()
        }
    },
)

type OmitFields = 'id' | 'created_at' | 'updated_at' | 'deleted_at'

export interface EntityApi<T> {
    basePath: string
    search: (params: SearchParams) => Promise<SearchResult<T>>
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

const api = {

    login() {
        window.location.href = env.api.baseURL + '/auth/login?r=' + encodeURIComponent(window.location.href)
    },

    async logout() {
        window.location.href = env.api.baseURL + '/auth/logout'
    },

    profile: {
        get: async () => await client.get<Admin>('/admin/profile').then(r => r.data),
    },

    admins: createEntityPath<Admin>('/admin/admins'),

    projects: {
        ...createEntityPath<Project>('/admin/projects'),
        all: async () => await client
            .get<Project[]>('/admin/projects/all')
            .then(r => r.data),
    },

    apiKeys: createProjectEntityPath<ProjectApiKey>('keys'),

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

    projectAdmins: createProjectEntityPath<Admin, ProjectAdminCreateParams>('admins'),

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
}

export default api;

(window as any).API = api
