import { createContext, Dispatch, SetStateAction } from 'react'
import { Admin, Campaign, Journey, List, LocaleOption, Organization, Project, Template, User, UseStateContext } from './types'

export const AdminContext = createContext<null | Admin>(null)

export const ProjectContext = createContext<[Project, Dispatch<SetStateAction<Project>>]>([
    {} as unknown as Project,
    () => {},
])

export const JourneyContext = createContext<UseStateContext<Journey>>([
    {} as unknown as Journey,
    () => {},
])

export interface LocaleSelection {
    currentLocale?: LocaleOption
    allLocales: LocaleOption[]
}
export const LocaleContext = createContext<UseStateContext<LocaleSelection>>([
    { allLocales: [] },
    () => {},
])

export const UserContext = createContext<UseStateContext<User>>([
    {} as unknown as User,
    () => {},
])

export const CampaignContext = createContext<UseStateContext<Campaign>>([
    {} as unknown as Campaign,
    () => {},
])

interface TemplateManager {
    currentTemplate?: Template
    templates: Template[]
    currentLocale?: LocaleOption
    locales: LocaleOption[]
    variants: Template[]
    setTemplate: Dispatch<SetStateAction<Template | undefined>>
}
export const TemplateContext = createContext<TemplateManager>({
    currentTemplate: undefined,
    templates: [],
    currentLocale: undefined,
    locales: [],
    variants: [],
    setTemplate: () => {},
})

export const ListContext = createContext<UseStateContext<List>>([
    {} as unknown as List,
    () => {},
])

export const OrganizationContext = createContext<UseStateContext<Organization>>([
    {} as unknown as Organization,
    () => {},
])
