
export class Project {

    public id!: number;
    public name!: string;
    public description?: string;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at?: Date;

    constructor(json: any) {
        Object.assign(this, json);
    }

}

export type ProjectParams = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
