import Router from '@koa/router'

const router = new Router({
    prefix: '/users'
})

router.get('/', (ctx, next) => {

})

export default router