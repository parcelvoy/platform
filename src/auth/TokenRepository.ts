import { addSeconds } from 'date-fns'
import { Context } from 'koa'
import { sign } from 'jsonwebtoken'
import { RevokedAccessToken } from './RevokedAccessToken'
import App from '../app'
import { Admin } from './Admin'

export interface OAuthResponse {
    access_token: string
    expires_at: Date
}

export async function isAccessTokenRevoked(token: string) {
    return (await RevokedAccessToken.count(qb => qb.where({ token }))) === 0
}

export async function revokeAccessToken(token: string, expires_at: Date) {
    await RevokedAccessToken.insert({ token, expires_at })
}

export async function cleanupExpiredRevokedTokens(until: Date) {
    await RevokedAccessToken.delete(qb => qb.where('expired_at', '<=', until))
}

type GenerateAccessToken = {
    (admin: Admin): OAuthResponse,
    (adminId: number): OAuthResponse,
}

export const generateAccessToken: GenerateAccessToken = (input: Admin | number) => {
    const id = typeof input === 'number' ? input : input.id
    const expires_at = addSeconds(Date.now(), App.main.env.auth.tokenLife)
    return {
        access_token: sign({
            id,
            exp: Math.floor(expires_at.getTime() / 1000),
        }, App.main.env.secret),
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
