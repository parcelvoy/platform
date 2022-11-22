import { addSeconds } from 'date-fns'
import { Context } from 'koa'
import { sign } from 'jsonwebtoken'
import { AccessToken } from './AccessToken'
import App from '../app'
import { Admin } from './Admin'

export interface OAuthResponse {
    access_token: string
    expires_at: Date
}

export async function isAccessTokenRevoked(token: string) {
    return (await AccessToken.count(qb => qb.where({ token, revoked: true }))) > 0
}

export async function revokeAccessToken(token: string) {
    await AccessToken.update(qb => qb.where({ token }), { revoked: true })
}

export async function cleanupExpiredRevokedTokens(until: Date) {
    await AccessToken.delete(qb => qb.where('expires_at', '<=', until))
}

export const generateAccessToken = (input: Admin | number, ctx?: Context) => {
    const id = typeof input === 'number' ? input : input.id
    const expires_at = addSeconds(Date.now(), App.main.env.auth.tokenLife)
    const token = sign({
        id,
        exp: Math.floor(expires_at.getTime() / 1000),
    }, App.main.env.secret)

    AccessToken.insert({
        admin_id: id,
        expires_at,
        token,
        revoked: false,
        ip: ctx?.request.ip ?? '',
        user_agent: ctx?.request.headers['user-agent'] || '',
    })

    return {
        access_token: token,
        expires_at,
    }
}

export const getTokenCookies = (ctx: Context) => {
    const cookie = ctx.cookies.get('oauth')
    if (cookie) {
        return JSON.parse(cookie) as OAuthResponse
    }
}

export const setTokenCookies = (ctx: Context, oauth: OAuthResponse): OAuthResponse => {

    ctx.cookies.set('oauth', JSON.stringify(oauth), {
        secure: ctx.request.secure,
        httpOnly: true,
        expires: oauth.expires_at,
    })

    return oauth
}
