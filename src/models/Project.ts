
export class Project {

    id!: number
    name!: string
    description?: string
    created_at!: Date
    updated_at!: Date
    deleted_at?: Date

    constructor(json: any) {
        Object.assign(this, json)
    }

}

export type ProjectParams = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>

export class ProjectApiKey {

    id!: number
    project_id!: number
    value!: string
    name!: string
    description?: string
    created_at!: Date
    updated_at!: Date
    deleted_at?: Date

    constructor(json: any) {
        Object.assign(this, json)
    }

}
