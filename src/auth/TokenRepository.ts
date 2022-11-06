import { addDays, addSeconds } from 'date-fns'
import { Context } from 'koa'
import { uuid } from '../utilities'
import { sign } from 'jsonwebtoken'
import { RefreshToken } from './RefreshToken'
import App from '../app'
import { Admin } from './Admin'

export interface AccessToken {
    token: string
    expires_at: Date
}

export interface OAuthResponse {
    refresh_token: string
    access_token: string
    expires_at: Date
    refresh_expires_at: Date
}

export const getRefreshToken = async (token: string): Promise<RefreshToken | undefined> => {
    return RefreshToken.first(qb => qb.where('token', token).where('revoked', false))
}

export const revokeRefreshToken = async (token: string): Promise<void> => {
    await RefreshToken.update(qb => qb.where('token', token), { revoked: true })
}

export const generateRefreshToken = async (adminId: number): Promise<RefreshToken> => {
    return await RefreshToken.insertAndFetch({
        admin_id: adminId,
        token: uuid(),
        expires_at: addDays(new Date(), 30),
    })
}

type GenerateAccessToken = {
    (admin: Admin): AccessToken,
    (adminId: number): AccessToken,
    (refreshToken: RefreshToken): AccessToken,
}

export const generateAccessToken: GenerateAccessToken = (input: Admin | number | RefreshToken): AccessToken => {
    const id = typeof input === 'number'
        ? input
        : input instanceof RefreshToken ? input.admin_id : input.id
    const expiration = addSeconds(Date.now(), App.main.env.auth.tokenLife)
    const token = sign({
        id,
        exp: Math.floor(expiration.getTime() / 1000),
    }, App.main.env.secret)

    return {
        token,
        expires_at: expiration,
    }
}

export const getOauth = (refreshToken: RefreshToken, accessToken: AccessToken): OAuthResponse => {
    return {
        refresh_token: refreshToken.token,
        access_token: accessToken.token,
        expires_at: accessToken.expires_at,
        refresh_expires_at: refreshToken.expires_at,
    }
}

export const setTokenCookies = (ctx: Context, oauth: OAuthResponse): OAuthResponse => {

    ctx.cookies.set('oauth', JSON.stringify(oauth), {
        secure: process.env.NODE_ENV !== 'development',
        httpOnly: true,
        expires: oauth.refresh_expires_at,
    })

    return oauth
}
