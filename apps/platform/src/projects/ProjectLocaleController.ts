import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { JSONSchemaType } from 'ajv'
import { createLocale, deleteLocale, pagedLocales, projectRoleMiddleware } from './ProjectService'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { LocaleParams } from './Locale'
import { validate } from '../core/validate'

const router = new Router<
    ProjectState & { locale?: Locale }
>({
    prefix: '/locales',
})

router.use(projectRoleMiddleware('admin'))

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedLocales(params, ctx.state.project.id)
})

const localeParams: JSONSchemaType<LocaleParams> = {
    $id: 'localeCreate',
    type: 'object',
    required: ['key', 'label'],
    properties: {
        key: { type: 'string' },
        label: { type: 'string' },
    },
    additionalProperties: false,
}
router.post('/', async ctx => {
    const payload = validate(localeParams, ctx.request.body)
    ctx.body = await createLocale(ctx.state.project.id, payload)
})

router.delete('/:keyId', async ctx => {
    ctx.body = await deleteLocale(ctx.state.project.id, parseInt(ctx.params.keyId))
})

export default router
