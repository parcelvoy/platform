import Router from '@koa/router'
import { JSONSchemaType } from 'ajv'
import { validate } from '../core/validate'
import { sign, verify } from 'jsonwebtoken'

const AuthController = new Router<{
    app: import('../app').default
        }>({
            prefix: '/auth',
        })

interface LoginParams {
    id: number // TODO username/password
}

const loginParamsSchema: JSONSchemaType<LoginParams> = {
    $id: 'loginParams',
    type: 'object',
    required: ['id'],
    properties: {
        id: {
            type: 'integer',
        },
    },
}

interface RefreshParams {
    refreshToken: string
}

const refreshParamsSchema: JSONSchemaType<RefreshParams> = {
    $id: 'refreshParams',
    type: 'object',
    required: ['refreshToken'],
    properties: {
        refreshToken: {
            type: 'string',
            minLength: 1,
        },
    },
}

AuthController
    .post('/login', async ctx => {
        const { id } = validate(loginParamsSchema, ctx.request.body)

        const {
            secret,
            refreshTokenSecret,
            tokenLife,
            refreshTokenLife,
        } = ctx.state.app.env.auth

        const claims = {
            id,
        }

        const token = sign(claims, secret, { expiresIn: tokenLife })
        const refreshToken = sign(claims, refreshTokenSecret, { expiresIn: refreshTokenLife })

        // TODO persist refresh token until expired

        ctx.body = { token, refreshToken }
    })
    .post('/refresh', async ctx => {
        const { refreshToken } = validate(refreshParamsSchema, ctx.request.body)

        // TODO make sure refresh token hasn't been forcibly expired (in db)

        const {
            secret,
            refreshTokenSecret,
            tokenLife,
        } = ctx.state.app.env.auth

        const { id } = verify(refreshToken, refreshTokenSecret) as { id: number }

        ctx.body = {
            token: sign({ id }, secret, { expiresIn: tokenLife }),
            // TODO rotate refresh token
        }
    })
    .post('/logout', async ctx => {

        // TODO mark refresh token in db as expired
        ctx.body = {}
    })

export default AuthController
