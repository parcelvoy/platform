import Model, { ModelParams } from '../core/Model'

export default class Project extends Model {
    organization_id!: number
    name!: string
    description?: string
    deleted_at?: Date
    locale!: string
    timezone!: string
    text_opt_out_message?: string
    text_help_message?: string
    link_wrap_email?: boolean
    link_wrap_push?: boolean
}

export type ProjectParams = Omit<Project, ModelParams | 'deleted_at' | 'organization_id'>

export const projectRoles = [
    'support',
    'editor',
    'admin',
] as const

export type ProjectRole = (typeof projectRoles)[number]
