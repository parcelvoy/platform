import Handlebars from 'handlebars'
import * as StrHelpers from './Helpers/String'
import * as NumHelpers from './Helpers/Number'
import * as DateHelpers from './Helpers/Date'
import * as UrlHelpers from './Helpers/Url'
import * as ArrayHelpers from './Helpers/Array'
import { User } from '../users/User'
import { unsubscribeEmailLink } from '../subscriptions/SubscriptionService'
import { clickWrapHTML, openWrapHtml } from './LinkService'

export interface RenderContext {
    template_id: number
    campaign_id: number
}

export interface Variables {
    context: RenderContext
    user: User
    event?: Record<string, any>
}

export interface TrackingParams {
    user: User
    campaign: number
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

export const Wrap = (html: string, { user, context }: Variables) => {
    const trackingParams = { userId: user.id, campaignId: context.campaign_id }
    html = clickWrapHTML(html, trackingParams)
    html = openWrapHtml(html, trackingParams)
    return html
}

export default (template: string, { user, event, context }: Variables) => {
    const trackingParams = { userId: user.id, campaignId: context?.campaign_id }
    console.log('context', {
        user: user.flatten(),
        event,
        context,
        unsubscribeEmailUrl: unsubscribeEmailLink(trackingParams),
    })
    return Compile(template, {
        user: user.flatten(),
        event,
        context,
        unsubscribeEmailUrl: unsubscribeEmailLink(trackingParams),
    })
}
