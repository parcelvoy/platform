// Will be re-enabled in API work
/* eslint-disable */

export interface TemplateUser {
    id: string
    email?: string
    phone?: string
}

export interface Device {
	token: string;
	os: string;
	model: string;
	app_build: string;
	app_version: string;
}

export interface UserAttribute {
	id: number;
	user_id: number;
	key: string;
	value: any;
}

export class User {
	id!: number
	project_id!: number
	external_id!: string
	email?: string
	phone?: string
	devices!: Device[]
	data!: Record<string, any> // first_name, last_name live in data
	attributes!: UserAttribute[] //???
	created_at!: Date
	updated_at!: Date

	constructor(data: any) {
		console.log(JSON.stringify(data))
		Object.assign(this, data)
	}
}