// Will be re-enabled in API work
/* eslint-disable */

import Model from '../core/Model'

export interface TemplateUser extends Record<string, any> {
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

export class User extends Model {
	project_id!: number
	external_id!: string
	email?: string
	phone?: string
	devices!: Device[]
	data!: Record<string, any> // first_name, last_name live in data
	attributes!: UserAttribute[] //???

	static jsonAttributes = ['data']

	flatten(): TemplateUser {
		return {
			...this.data,
			email: this.email,
			phone: this.phone,
			id: this.external_id,
		}
	}
}
