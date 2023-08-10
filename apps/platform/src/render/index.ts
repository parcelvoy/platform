import Handlebars from 'handlebars'
import * as CommonHelpers from './Helpers/Common'
import * as StrHelpers from './Helpers/String'
import * as NumHelpers from './Helpers/Number'
import * as DateHelpers from './Helpers/Date'
import * as UrlHelpers from './Helpers/Url'
import * as ArrayHelpers from './Helpers/Array'
import { User } from '../users/User'
import { preferencesLink, unsubscribeEmailLink } from '../subscriptions/SubscriptionService'
import { clickWrapHtml, openWrapHtml, preheaderWrapHtml } from './LinkService'
import Project from '../projects/Project'

export type RenderContext = {
    template_id: number
    campaign_id: number
    subscription_id: number
    user_step_id?: number
} & Record<string, unknown>

export interface Variables {
    context: RenderContext
    user: User
    event?: Record<string, any>
    project: Project
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

loadHelper(CommonHelpers)
loadHelper(StrHelpers)
loadHelper(NumHelpers)
loadHelper(DateHelpers)
loadHelper(UrlHelpers)
loadHelper(ArrayHelpers)

export const compileTemplate = <T = any>(template: string) => {
    return Handlebars.compile<T>(template)
}

interface WrapParams {
    html: string
    preheader?: string
    variables: Variables
}
export const Wrap = ({ html, preheader, variables: { user, context, project } }: WrapParams) => {
    const trackingParams = {
        userId: user.id,
        campaignId: context.campaign_id,
        userStepId: context.user_step_id,
    }

    // Check if link wrapping is enabled first
    if (project.link_wrap) {
        html = clickWrapHtml(html, trackingParams)
    }

    // Open wrap & preheader wrap
    html = openWrapHtml(html, trackingParams)
    if (preheader) html = preheaderWrapHtml(html, preheader)
    return html
}

export default (template: string, { user, event, context }: Variables) => {
    return compileTemplate(template)({
        user: user.flatten(),
        event,
        context,
        unsubscribeEmailUrl: unsubscribeEmailLink({
            userId: user.id,
            campaignId: context?.campaign_id,
            userStepId: context.user_step_id,
        }),
        preferencesUrl: preferencesLink(user.id),
    })
}
