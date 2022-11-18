import jwt from 'jsonwebtoken'
import { Context, Request } from 'koa'
import App from '../app'
import { RequestError } from '../core/errors'
import Project from '../projects/Project'
import { ProjectApiKey } from '../projects/ProjectApiKey'
import { getProjectApiKey } from '../projects/ProjectService'
import AuthError from './AuthError'
import { OAuthResponse } from './TokenRepository'

export interface JwtAdmin {
    id: number
}

export interface State {
    app: App
}

type AuthScope = 'admin' | 'public' | 'secret'
export interface AuthState {
    scope: AuthScope
    admin?: JwtAdmin
    key?: ProjectApiKey
}

export interface ProjectState extends AuthState {
    project: Project
}

const parseAuth = async (ctx: Context) => {
    const token = getBearerToken(ctx.request)
    if (!token) {
        throw new RequestError(AuthError.AuthorizationError)
    }

    if (token.startsWith('pk_')) {
        // public key
        return {
            scope: 'public',
            key: await getProjectApiKey(token),
        }
    } else if (token.startsWith('sk_')) {
        // secret key
        return {
            scope: 'secret',
            key: await getProjectApiKey(token),
        }
    } else {
        // user jwt
        return {
            scope: 'admin',
            admin: await verify(token) as JwtAdmin,
        }
    }
}

export async function authMiddleware(ctx: Context, next: () => void) {
    try {
        const state = await parseAuth(ctx)
        ctx.state = { ...ctx.state, ...state }
    } catch (error) {
        ctx.status = 401
        return
    }
    return next()
}

export const scopeMiddleware = (scope: string) => {
    return async function authMiddleware(ctx: Context, next: () => void) {
        if (ctx.state.scope !== scope) {
            throw new RequestError(AuthError.AccessDenied)
        }
        return next()
    }
}

const verify = async (token: string) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, App.main.env.secret, (error, decoded) => {
            error ? reject(error) : resolve(decoded)
        })
    })
}

const getBearerToken = (request: Request): string | undefined => {
    const authHeader = String(request.headers.authorization || '')
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7, authHeader.length)
    }
    const cookie = request.ctx.cookies.get('oauth')
    if (cookie) {
        try {
            const { access_token } = JSON.parse(cookie) as OAuthResponse
            if (access_token) {
                return access_token
            }
        } catch {}
    }
}
