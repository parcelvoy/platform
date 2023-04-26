import Model, { ModelParams } from '../core/Model'
import { NamedEmail } from '../providers/email/Email'

interface ProjectDefaults {
    from?: NamedEmail
}

export default class Project extends Model {

    name!: string
    description?: string
    deleted_at?: Date
    locale?: string
    timezone!: string
    defaults?: ProjectDefaults

    static jsonAttributes = ['defaults']
}

export type ProjectParams = Omit<Project, ModelParams | 'deleted_at'>

export const projectRoles = [
    'support',
    'editor',
    'admin',
] as const

export type ProjectRole = (typeof projectRoles)[number]
