import Axios from 'axios'
import { env } from './config/env'
import { Admin, AuthMethod, Campaign, CampaignCreateParams, CampaignLaunchParams, CampaignUpdateParams, CampaignUser, Image, Journey, JourneyEntranceDetail, JourneyStepMap, JourneyUserStep, List, ListCreateParams, ListUpdateParams, Locale, Organization, OrganizationUpdateParams, Project, ProjectAdmin, ProjectAdminInviteParams, ProjectAdminParams, ProjectApiKey, ProjectApiKeyParams, Provider, ProviderCreateParams, ProviderMeta, ProviderUpdateParams, QueueMetric, Resource, RuleSuggestions, SearchParams, SearchResult, Series, Subscription, SubscriptionCreateParams, SubscriptionParams, SubscriptionUpdateParams, Tag, Template, TemplateCreateParams, TemplatePreviewParams, TemplateProofParams, TemplateUpdateParams, User, UserEvent, UserSubscription } from './types'

function appendValue(params: URLSearchParams, name: string, value: unknown) {
    if (typeof value === 'undefined' || value === null || typeof value === 'function') return
    if (typeof value === 'object') value = JSON.stringify(value)
    params.append(name, value + '')
}

export const client = Axios.create({
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
            api.auth.login()
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

type OmitFields = 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'stats' | 'stats_at'

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
export const apiUrl = (projectId: number | string, path: string) => `${env.api.baseURL}/admin/projects/${projectId}/${path}`

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

    auth: {
        methods: async () => await client
            .get<AuthMethod[]>('/auth/methods')
            .then(r => r.data),
        check: async (method: string, email: string) => await client
            .post<boolean>('/auth/check', { method, email })
            .then(r => r.data),
        basicAuth: async (email: string, password: string, redirect: string = '/') => {
            await client.post('/auth/login/basic/callback', { email, password })
            window.location.href = redirect
        },
        emailAuth: async (email: string, redirect: string = '/') => {
            await client.post('/auth/login/email', { email, redirect })
        },
        login() {
            window.location.href = `/login?r=${encodeURIComponent(window.location.href)}`
        },
        async logout() {
            window.location.href = env.api.baseURL + '/auth/logout'
        },
    },

    profile: {
        get: async () => {
            if (!cache.profile) {
                cache.profile = await client.get<Admin>('/admin/profile').then(r => r.data)
            }
            return cache.profile!
        },
    },

    admins: createEntityPath<Admin>('/admin/organizations/admins'),

    projects: {
        ...createEntityPath<Project>('/admin/projects'),
        all: async () => await client
            .get<Project[]>('/admin/projects/all')
            .then(r => r.data),
        pathSuggestions: async (projectId: number | string) => await client
            .get<RuleSuggestions>(`${projectUrl(projectId)}/data/paths`)
            .then(r => r.data),
        rebuildPathSuggestions: async (projectId: number | string) => await client
            .post(`${projectUrl(projectId)}/data/paths/sync`)
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
        duplicate: async (projectId: number | string, journeyId: number | string) => await client
            .post<Campaign>(`${projectUrl(projectId)}/journeys/${journeyId}/duplicate`)
            .then(r => r.data),
        steps: {
            get: async (projectId: number | string, journeyId: number | string) => await client
                .get<JourneyStepMap>(`/admin/projects/${projectId}/journeys/${journeyId}/steps`)
                .then(r => r.data),
            set: async (projectId: number | string, journeyId: number | string, stepData: JourneyStepMap) => await client
                .put<JourneyStepMap>(`/admin/projects/${projectId}/journeys/${journeyId}/steps`, stepData)
                .then(r => r.data),
            searchUsers: async (projectId: number | string, journeyId: number | string, stepId: number | string, params: SearchParams) => await client
                .get<SearchResult<JourneyUserStep>>(`/admin/projects/${projectId}/journeys/${journeyId}/steps/${stepId}/users`, { params })
                .then(r => r.data),
        },
        entrances: {
            search: async (projectId: number | string, journeyId: number | string, params: SearchParams) => await client
                .get<SearchResult<JourneyUserStep>>(`/admin/projects/${projectId}/journeys/${journeyId}/entrances`, { params })
                .then(r => r.data),
            log: async (projectId: number | string, entranceId: number | string) => await client
                .get<JourneyEntranceDetail>(`${projectUrl(projectId)}/journeys/entrances/${entranceId}`)
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

        journeys: {
            search: async (projectId: number | string, userId: number | string, params: SearchParams) => await client
                .get<SearchResult<JourneyUserStep>>(`${projectUrl(projectId)}/users/${userId}/journeys`, { params })
                .then(r => r.data),
        },
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
        duplicate: async (projectId: number | string, listId: number | string) => await client
            .post<List>(`${projectUrl(projectId)}/lists/${listId}/duplicate`)
            .then(r => r.data),
        recount: async (projectId: number | string, listId: number | string) => await client
            .post<List>(`${projectUrl(projectId)}/lists/${listId}/recount`)
            .then(r => r.data),
    },

    projectAdmins: {
        search: async (projectId: number, params: SearchParams) => await client
            .get<SearchResult<ProjectAdmin>>(`${projectUrl(projectId)}/admins`, { params })
            .then(r => r.data),
        add: async (projectId: number, adminId: number, params: ProjectAdminParams) => await client
            .put<ProjectAdmin>(`${projectUrl(projectId)}/admins/${adminId}`, params)
            .then(r => r.data),
        invite: async (projectId: number, params: ProjectAdminInviteParams) => await client
            .post<ProjectAdmin>(`${projectUrl(projectId)}/admins`, params)
            .then(r => r.data),
        get: async (projectId: number, adminId: number) => await client
            .get<ProjectAdmin>(`${projectUrl(projectId)}/admins/${adminId}`)
            .then(r => r.data),
        remove: async (projectId: number, adminId: number) => await client
            .delete(`${projectUrl(projectId)}/admins/${adminId}`)
            .then(r => r.data),
    },

    subscriptions: createProjectEntityPath<Subscription, SubscriptionCreateParams, SubscriptionUpdateParams>('subscriptions'),

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
        get: async (projectId: number | string, group: string, type: string, entityId: number | string) => await client
            .get<Provider>(`${projectUrl(projectId)}/providers/${group}/${type}/${entityId}`)
            .then(r => r.data),
        create: async (projectId: number | string, { group, type, ...provider }: ProviderCreateParams) => await client
            .post<Provider>(`${projectUrl(projectId)}/providers/${group}/${type}`, provider)
            .then(r => r.data),
        update: async (projectId: number | string, entityId: number | string, { group, type, ...provider }: ProviderUpdateParams) => await client
            .patch<Provider>(`${projectUrl(projectId)}/providers/${group}/${type}/${entityId}`, provider)
            .then(r => r.data),
        delete: async (projectId: number | string, id: number) => await client
            .delete<number>(`${projectUrl(projectId)}/providers/${id}`)
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

    resources: {
        all: async (projectId: number | string, type: string = 'font') => await client
            .get<Resource[]>(`${projectUrl(projectId)}/resources?type=${type}`)
            .then(r => r.data),
        create: async (projectId: number | string, params: Partial<Resource>) => await client
            .post<Resource>(`${projectUrl(projectId)}/resources`, params)
            .then(r => r.data),
        delete: async (projectId: number | string, id: number) => await client
            .delete<number>(`${projectUrl(projectId)}/resources/${id}`)
            .then(r => r.data),
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
        get: async () => await client
            .get<Organization>('/admin/organizations')
            .then(r => r.data),
        update: async (id: number | string, params: OrganizationUpdateParams) => await client
            .patch<Organization>(`/admin/organizations/${id}`, params)
            .then(r => r.data),
        delete: async () => await client
            .delete('/admin/organizations')
            .then(r => r.data),
        metrics: async () => await client
            .get<QueueMetric>('/admin/organizations/performance/queue')
            .then(r => r.data),
        jobs: async () => await client
            .get<string[]>('/admin/organizations/performance/jobs')
            .then(r => r.data),
        jobPerformance: async (job: string) => await client
            .get<{ throughput: Series[], timing: Series[] }>(`/admin/organizations/performance/jobs/${job}`)
            .then(r => r.data),
        failed: async () => await client
            .get<any>('/admin/organizations/performance/failed')
            .then(r => r.data),
    },

    locales: createProjectEntityPath<Locale>('locales'),
}

export default api;

(window as any).API = api
