import Handlebars from 'handlebars'
import * as StrHelpers from './Helpers/String'
import * as NumHelpers from './Helpers/Number'
import * as DateHelpers from './Helpers/Date'
import * as UrlHelpers from './Helpers/Url'
import * as ArrayHelpers from './Helpers/Array'
import { User } from '../users/User'
import { unsubscribeLink } from '../subscriptions/SubscriptionService'

export interface RenderContext {
    template_id: number
    campaign_id: number
}

export interface Variables {
    context: RenderContext
    user: User
    event?: Record<string, any>
}

const loadHelper = (helper: Record<string, any>) => {
    const keys = Object.keys(helper)
    const values = Object.values(helper)
    for (const [i] of keys.entries()) {
        Handlebars.registerHelper(keys[i], values[i])
    }
}

loadHelper(StrHelpers)
loadHelper(NumHelpers)
loadHelper(DateHelpers)
loadHelper(UrlHelpers)
loadHelper(ArrayHelpers)

export const Compile = (template: string, context: Record<string, any> = {}) => {
    return Handlebars.compile(template)(context)
}

export default (template: string, { user, event, context }: Variables) => {
    return Compile(template, {
        user: user.flatten(),
        event,
        context,
        unsubscribeUrl: unsubscribeLink(user, context?.campaign_id),
    })
}
