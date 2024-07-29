import { URL } from 'node:url'
import App from '../app'
import Campaign from '../campaigns/Campaign'
import CampaignInteractJob from '../campaigns/CampaignInteractJob'
import { getCampaign } from '../campaigns/CampaignService'
import EventPostJob from '../client/EventPostJob'
import { User } from '../users/User'
import { getUser } from '../users/UserRepository'
import { combineURLs, decodeHashid, encodeHashid } from '../utilities'

export interface TrackedLinkParams {
    userId: number
    campaignId: number
    referenceId?: string
}

interface TrackedLinkParts extends TrackedLinkParams {
    path: string
    redirect?: string
}

export const paramsToEncodedLink = (params: TrackedLinkParts): string => {
    const hashUserId = encodeHashid(params.userId)
    const hashCampaignId = encodeHashid(params.campaignId)

    const baseUrl = combineURLs([App.main.env.baseUrl, params.path])
    const url = new URL(baseUrl)
    url.searchParams.set('u', hashUserId)
    url.searchParams.set('c', hashCampaignId)
    if (params.referenceId) {
        url.searchParams.set('s', params.referenceId)
    }
    if (params.redirect) {
        url.searchParams.set('r', encodeURIComponent(params.redirect))
    }
    return url.href
}

interface TrackedLinkExport {
    user?: User
    campaign?: Campaign
    referenceId?: string
    redirect: string
}

export const encodedLinkToParts = async (link: string | URL): Promise<TrackedLinkExport> => {
    const url = link instanceof URL ? link : new URL(link)
    const userId = decodeHashid(url.searchParams.get('u'))
    const campaignId = decodeHashid(url.searchParams.get('c'))
    const referenceId = url.searchParams.get('s') ?? undefined
    const redirect = decodeURIComponent(url.searchParams.get('r') ?? '')

    const parts: TrackedLinkExport = { redirect, referenceId }

    if (userId) {
        parts.user = await getUser(userId)

        if (parts.user && campaignId) {
            parts.campaign = await getCampaign(campaignId, parts.user.project_id)
        }
    }

    return parts
}

export const clickWrapHtml = (html: string, params: TrackedLinkParams) => {
    const regex = /a.*\s*href\s*=\s*(['"])(https?:\/\/.+?)\1/gi
    let link

    while ((link = regex.exec(html)) !== null) {
        const redirect = link[2]

        html = html.replace(
            redirect,
            paramsToEncodedLink({ ...params, redirect, path: 'c' }),
        )
    }

    return html
}

export const openWrapHtml = (html: string, params: TrackedLinkParams) => {
    const link = paramsToEncodedLink({ ...params, path: 'o' })
    const imageHtml = `<img border="0" width="1" height="1" alt="" src="${link}" />`
    return injectInBody(html, imageHtml, 'end')
}

export const preheaderWrapHtml = (html: string, preheader: string) => {
    const preheaderHtml = `<span style="color:transparent;visibility:hidden;display:none;opacity:0;height:0;width:0;font-size:0">${preheader}</span>`
    return injectInBody(html, preheaderHtml, 'start')
}

export const injectInBody = (html: string, injection: string, placement: 'start' | 'end') => {
    if (placement === 'end') {
        const bodyTag = '</body'
        html = html.includes(bodyTag)
            ? html = html.replace(bodyTag, (injection + bodyTag))
            : html += injection
    } else {
        const regex = /<body(?:.|\n)*?>/
        const match = html.match(regex)
        if (match) {
            const offset = match.index! + match[0].length
            html = html.substring(0, offset) + injection + html.substring(offset)
        } else {
            html = injection + html
        }
    }
    return html
}

export type TrackMessageType = 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'
export const trackMessageEvent = async (
    parts: Partial<TrackedLinkExport>,
    type: TrackMessageType,
    action?: 'unsubscribe',
    context?: any,
) => {
    const { user, campaign, referenceId } = parts
    if (!user || !campaign) return

    const eventJob = EventPostJob.from({
        project_id: user.project_id,
        event: {
            external_id: user.external_id,
            name: campaign.eventName(type),
            data: {
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                campaign_type: campaign.type,
                channel: campaign.channel,
                subscription_id: campaign.subscription_id,
                url: parts.redirect,
                context,
            },
        },
        forward: true,
    })

    const campaignJob = CampaignInteractJob.from({
        campaign_id: campaign.id,
        user_id: user.id,
        reference_id: referenceId ?? '0',
        subscription_id: campaign.subscription_id,
        type,
        action,
    })

    await App.main.queue.enqueueBatch([
        eventJob,
        campaignJob,
    ])
}
