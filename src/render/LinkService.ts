import { URL } from 'node:url'
import App from '../app'
import Campaign from '../campaigns/Campaign'
import { getCampaign } from '../campaigns/CampaignService'
import EventPostJob from '../client/EventPostJob'
import { User } from '../users/User'
import { getUser } from '../users/UserRepository'
import { combineURLs, decodeHashid, encodeHashid } from '../utilities'

export interface TrackedLinkParams {
    userId: number
    campaignId: number
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
    if (params.redirect) {
        url.searchParams.set('r', encodeURIComponent(params.redirect))
    }
    return url.href
}

interface TrackedLinkExport {
    user?: User
    campaign?: Campaign
    redirect: string
}

export const encodedLinkToParts = async (link: string | URL): Promise<TrackedLinkExport> => {
    const url = link instanceof URL ? link : new URL(link)
    const userId = decodeHashid(url.searchParams.get('u'))
    const campaignId = decodeHashid(url.searchParams.get('c'))
    const redirect = decodeURIComponent(url.searchParams.get('r') ?? '')

    const parts: TrackedLinkExport = { redirect }

    if (userId) {
        parts.user = await getUser(userId)

        if (parts.user && campaignId) {
            parts.campaign = await getCampaign(campaignId, parts.user.project_id)
        }
    }

    return parts
}

export const clickWrapHTML = (html: string, params: TrackedLinkParams) => {
    const regex = /href\s*=\s*(['"])(https?:\/\/.+?)\1/gi
    let link

    while ((link = regex.exec(html)) !== null) {
        const redirect = link[2]

        // Don't wrap already wrapped links
        if (redirect.startsWith(App.main.env.baseUrl)) continue

        // Otherwise create a link wrapper around the value
        html = html.replace(
            redirect,
            paramsToEncodedLink({ ...params, redirect, path: 'c' }),
        )
    }

    return html
}

export const openWrapHtml = (html: string, params: TrackedLinkParams) => {
    const bodyTag = '</body>'
    const link = paramsToEncodedLink({ ...params, path: 'o' })
    const imageHtml = `<img border="0" width="1" height="1" alt="" src="${link}" />`
    const hasBody = html.includes(bodyTag)
    if (hasBody) {
        html.replace(bodyTag, imageHtml + bodyTag)
    } else {
        html += imageHtml
    }
    return html
}

export const trackLinkEvent = async (parts: TrackedLinkExport, eventName: string) => {
    const { user, campaign } = parts
    if (!user || !campaign) return

    const job = EventPostJob.from({
        project_id: user.project_id,
        event: {
            external_id: user.external_id,
            name: eventName,
            data: {
                campaign_id: campaign.id,
                channel: campaign.channel,
                template_id: campaign.template_id,
                url: parts.redirect,
            },
        },
    })

    await App.main.queue.enqueue(job)
}
