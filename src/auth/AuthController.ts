import Router from '@koa/router'
import { JSONSchemaType } from 'ajv'
import App from '../app'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { validate } from '../core/validate'
import { generateAccessToken, getOauth, getRefreshToken, setTokenCookies } from './TokenRepository'
const router = new Router<{
    app: import('../app').default
        }>({
            prefix: '/auth',
        })

router.get('/login', async ctx => {
    await App.main.auth.start(ctx)
})

router.post('/login', async ctx => {
    await App.main.auth.start(ctx)
})

router.post('/login/callback', async ctx => {
    ctx.status = 204
    await App.main.auth.validate(ctx)
})

router.get('/login/callback', async ctx => {
    ctx.status = 204
    await App.main.auth.validate(ctx)
})

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

router.post('/refresh', async ctx => {
    const { refreshToken: token } = validate(refreshParamsSchema, ctx.request.body)

    const refreshToken = await getRefreshToken(token)
    if (!refreshToken) {
        throw new RequestError(AuthError.InvalidRefreshToken)
    }

    const accessToken = generateAccessToken(refreshToken)
    const oauth = getOauth(refreshToken, accessToken)
    ctx.body = setTokenCookies(ctx, oauth)
})

router.post('/logout', async ctx => {

    // TODO mark refresh token in db as expired
    ctx.body = {}
})

export default router
