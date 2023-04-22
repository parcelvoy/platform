import Router from '@koa/router'
import Project, { ProjectParams } from './Project'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { ParameterizedContext } from 'koa'
import { createProject, getProject, requireProjectRole } from './ProjectService'
import { AuthState, ProjectState } from '../auth/AuthMiddleware'
import { getProjectAdmin } from './ProjectAdminRepository'
import { RequestError } from '../core/errors'
import { ProjectError } from './ProjectError'

export async function projectMiddleware(ctx: ParameterizedContext<ProjectState>, next: () => void) {

    const project = await getProject(
        ctx.state.scope === 'admin'
            ? ctx.params.project
            : ctx.state.key!.project_id,
    )

    if (!project) {
        throw new RequestError(ProjectError.ProjectDoesNotExist)
    }

    ctx.state.project = project

    if (ctx.state.scope === 'admin') {
        const projectAdmin = await getProjectAdmin(project.id, ctx.state.admin!.id)
        if (!projectAdmin) {
            throw new RequestError(ProjectError.ProjectAccessDenied)
        }
        ctx.state.projectRole = projectAdmin.role ?? 'support'
    } else {
        ctx.state.projectRole = ctx.state.key!.role ?? 'support'
    }

    return next()
}

const router = new Router<AuthState>({ prefix: '/projects' })

router.get('/', async ctx => {
    ctx.body = await Project.searchParams(extractQueryParams(ctx.request.query, searchParamsSchema), ['name'])
})

router.get('/all', async ctx => {
    ctx.body = await Project.all()
})

const projectCreateParams: JSONSchemaType<ProjectParams> = {
    $id: 'projectCreate',
    type: 'object',
    required: ['name', 'timezone'],
    properties: {
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
            nullable: true,
        },
        locale: {
            type: 'string',
            nullable: true,
        },
        timezone: { type: 'string' },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(projectCreateParams, ctx.request.body)
    ctx.body = await createProject(ctx.state.admin!.id, payload)
})

export default router

const subrouter = new Router<ProjectState>()

subrouter.get('/', async ctx => {
    ctx.body = {
        ...ctx.state.project,
        role: ctx.state.projectRole,
    }
})

const projectUpdateParams: JSONSchemaType<Partial<ProjectParams>> = {
    $id: 'projectUpdate',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            nullable: true,
        },
        description: {
            type: 'string',
            nullable: true,
        },
        locale: {
            type: 'string',
            nullable: true,
        },
        timezone: {
            type: 'string',
            nullable: true,
        },
    },
    additionalProperties: false,
}

subrouter.patch('/', async ctx => {
    requireProjectRole(ctx, 'admin')
    ctx.body = await Project.updateAndFetch(ctx.state.project!.id, validate(projectUpdateParams, ctx.request.body))
})

export { subrouter as ProjectSubrouter }
