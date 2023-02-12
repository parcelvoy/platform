import { createContext, Dispatch, SetStateAction, Key } from 'react'
import { Admin, Campaign, Journey, List, Project, Template, User, UseStateContext } from './types'
import { FieldOption } from './ui/form/Field'

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
    currentLocale?: Key
    allLocales: FieldOption[]
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

export const TemplateContext = createContext<UseStateContext<Template>>([
    {} as unknown as Template,
    () => {},
])

export const ListContext = createContext<UseStateContext<List>>([
    {} as unknown as List,
    () => {},
])
