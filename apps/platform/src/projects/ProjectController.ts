import Router from '@koa/router'
import { ParameterizedContext } from 'koa'
import App from '../app'
import { getAdmin } from '../auth/AdminRepository'
import { AuthState, ProjectState } from '../auth/AuthMiddleware'
import { RequestError } from '../core/errors'
import { searchParamsSchema } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import { requireOrganizationRole } from '../organizations/OrganizationService'
import { hasProvider } from '../providers/ProviderService'
import { RulePathVisibility } from '../rules/ProjectRulePath'
import UserSchemaSyncJob from '../schema/UserSchemaSyncJob'
import { extractQueryParams } from '../utilities'
import { ProjectParams } from './Project'
import { getProjectAdmin } from './ProjectAdminRepository'
import { ProjectError } from './ProjectError'
import { getRulePaths, pagedUserRulePaths, updateRulePath } from './ProjectRulePathRepository'
import { allProjects, createProject, getProject, pagedProjects, requireProjectRole, updateProject } from './ProjectService'

export async function projectMiddleware(ctx: ParameterizedContext<ProjectState>, next: () => void) {

    if (ctx.state.scope !== 'admin' && !ctx.state.key) {
        throw new RequestError(ProjectError.ProjectDoesNotExist)
    }

    if (ctx.state.scope === 'admin' && !ctx.params.project) {
        throw new RequestError(ProjectError.ProjectDoesNotExist)
    }

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
        // admins and owners automatically get full access
        if (project.organization_id === ctx.state.admin!.organization_id && ctx.state.admin?.role !== 'member') {
            ctx.state.projectRole = 'admin'
        } else {
            const projectAdmin = await getProjectAdmin(project.id, ctx.state.admin!.id)
            if (!projectAdmin) {
                throw new RequestError(ProjectError.ProjectAccessDenied)
            }
            ctx.state.projectRole = projectAdmin.role ?? 'support'
        }
    } else {
        ctx.state.projectRole = ctx.state.key!.role ?? 'support'
    }

    return next()
}

const router = new Router<AuthState>({ prefix: '/projects' })

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    const { id, organization_id } = ctx.state.admin!
    ctx.body = await pagedProjects(params, id, organization_id)
})

router.get('/all', async ctx => {
    const { id, organization_id } = ctx.state.admin!
    ctx.body = await allProjects(id, organization_id)
})

const projectCreateParams: JSONSchemaType<ProjectParams> = {
    $id: 'projectCreate',
    type: 'object',
    required: ['name', 'timezone', 'locale'],
    properties: {
        name: { type: 'string' },
        description: {
            type: 'string',
            nullable: true,
        },
        locale: { type: 'string' },
        timezone: { type: 'string' },
        text_opt_out_message: {
            type: 'string',
            nullable: true,
        },
        text_help_message: {
            type: 'string',
            nullable: true,
        },
        link_wrap_email: {
            type: 'boolean',
            nullable: true,
        },
        link_wrap_push: {
            type: 'boolean',
            nullable: true,
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    requireOrganizationRole(ctx.state.admin!, 'admin')
    const payload = validate(projectCreateParams, ctx.request.body)
    const { id, organization_id } = ctx.state.admin!
    const admin = await getAdmin(id, organization_id)
    const project = await createProject(admin!, payload)
    ctx.body = {
        ...project,
        has_provider: await hasProvider(project.id),
    }
})

export default router

const subrouter = new Router<ProjectState>()

subrouter.get('/', async ctx => {
    ctx.body = {
        ...ctx.state.project,
        role: ctx.state.projectRole,
        has_provider: await hasProvider(ctx.state.project.id),
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
        text_opt_out_message: {
            type: 'string',
            nullable: true,
        },
        text_help_message: {
            type: 'string',
            nullable: true,
        },
        link_wrap_email: {
            type: 'boolean',
            nullable: true,
        },
        link_wrap_push: {
            type: 'boolean',
            nullable: true,
        },
    },
    additionalProperties: false,
}

subrouter.patch('/', async ctx => {
    requireProjectRole(ctx, 'admin')
    const { admin, project } = ctx.state
    const payload = validate(projectUpdateParams, ctx.request.body)
    ctx.body = {
        ...await updateProject(project.id, admin!.id, payload),
        role: ctx.state.projectRole,
        has_provider: await hasProvider(ctx.state.project.id),
    }
})

subrouter.get('/data/paths', async ctx => {
    const visibilities: RulePathVisibility[] = ctx.state.projectRole === 'admin'
        ? ['public', 'classified']
        : ['public']
    ctx.body = await getRulePaths(ctx.state.project.id, visibilities)
})

subrouter.get('/data/paths/users', async ctx => {
    requireProjectRole(ctx, 'admin')
    const search = extractQueryParams(ctx.query, searchParamsSchema)
    const visibilities: RulePathVisibility[] = ctx.state.projectRole === 'admin'
        ? ['public', 'classified', 'hidden']
        : ['public']
    ctx.body = await pagedUserRulePaths({
        search,
        projectId: ctx.state.project.id,
        visibilities,
    })
})

subrouter.put('/data/paths/users/:pathId', async ctx => {
    requireProjectRole(ctx, 'admin')

    ctx.body = await updateRulePath(parseInt(ctx.params.pathId), ctx.request.body.visibility)
})

subrouter.post('/data/paths/sync', async ctx => {
    App.main.queue.enqueue(UserSchemaSyncJob.from({
        project_id: ctx.state.project.id,
        // no delta, rebuild the whole thing
    }))
    ctx.status = 204
})

export { subrouter as ProjectSubrouter }
