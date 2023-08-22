import Router from '@koa/router'
import Admin from '../auth/Admin'
import { AuthState } from '../auth/AuthMiddleware'

const router = new Router<AuthState>({
    prefix: '/profile',
})

router.get('/', async ctx => {
    ctx.body = await Admin.find(ctx.state.admin!.id)
})

export default router
