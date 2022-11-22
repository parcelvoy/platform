import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'
import { templateScreenshotUrl } from './TemplateService'

export default class Template extends Model {
    project_id!: number
    name!: string
    type!: ChannelType
    data!: Record<string, any>

    static tableName = 'templates'

    static jsonAttributes = ['data']
    static virtualAttributes = ['screenshotUrl']

    map(): TemplateType {
        const json = this as any
        if (this.type === 'email') {
            return EmailTemplate.fromJson(json)
        } else if (this.type === 'text') {
            return TextTemplate.fromJson(json)
        } else if (this.type === 'push') {
            return PushTemplate.fromJson(json)
        }
        return WebhookTemplate.fromJson(json)
    }

    get screenshotUrl() {
        return templateScreenshotUrl(this.id)
    }
}

export type TemplateParams = Omit<Template, ModelParams | 'map'>

export type TemplateType = EmailTemplate | TextTemplate | PushTemplate | WebhookTemplate

export class EmailTemplate extends Template {
    declare type: 'email'
    from!: string
    cc?: string
    bcc?: string
    reply_to?: string
    subject!: string
    text_body!: string
    html_body!: string

    parseJson(json: any) {
        super.parseJson(json)

        this.from = json?.data.from
        this.cc = json?.data.cc
        this.bcc = json?.data.bcc
        this.reply_to = json?.data.reply_to
        this.subject = json?.data.subject
        this.text_body = json?.data.text_body
        this.html_body = json?.data.html_body
    }
}

export class TextTemplate extends Template {
    declare type: 'text'
    from!: string
    text!: string

    parseJson(json: any) {
        super.parseJson(json)

        this.from = json?.data.from
        this.text = json?.data.text
    }
}

export class PushTemplate extends Template {
    declare type: 'push'
    title!: string
    topic!: string
    body!: string
    custom!: Record<string, any>

    parseJson(json: any) {
        super.parseJson(json)

        this.title = json?.data.title
        this.topic = json?.data.topic
        this.body = json?.data.body
        this.custom = json?.data.custom
    }
}

export class WebhookTemplate extends Template {
    declare type: 'webhook'
    method!: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
    endpoint!: string
    body!: Record<string, any>
    query: Record<string, string | string[]> = {}
    headers: Record<string, string> = {}

    parseJson(json: any) {
        super.parseJson(json)

        this.method = json?.data.method
        this.endpoint = json?.data.endpoint
        this.body = json?.data.body
        this.query = json?.data.query || {}
        this.headers = json?.data.headers || {}
    }
}
