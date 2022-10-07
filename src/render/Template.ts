import { ChannelType } from '../config/channels'
import Model, { ModelParams } from '../core/Model'

export class Template extends Model {
    project_id!: number
    name!: string
    type!: ChannelType
    data!: Record<string, any>

    static tableName = 'templates'
}

export type TemplateParams = Omit<Template, ModelParams>

export class EmailTemplate extends Template {
    to!: string
    from!: string
    cc!: string
    bcc!: string
    reply_to!: string
    subject!: string
    text_body!: string
    html_body!: string

    parseJson(json: any) {
        super.parseJson(json)

        this.to = json?.data.to
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
    // TODO: Should there be a to? It's the only way to customize
    // using handlebars, which is useful for email, but may not be for
    // text message. Also could lead to some weird behaviors
    from!: string
    text!: string

    parseJson(json: any) {
        super.parseJson(json)

        this.from = json?.data.from
        this.text = json?.data.text
    }
}

export class PushTemplate extends Template {
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
