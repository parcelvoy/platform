import Router from '@koa/router'
import { ProjectParams } from './Project'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { ParameterizedContext } from 'koa'
import { allProjects, createProject, getProject, pagedProjects, requireProjectRole, updateProject } from './ProjectService'
import { AuthState, ProjectState } from '../auth/AuthMiddleware'
import { getProjectAdmin } from './ProjectAdminRepository'
import { RequestError } from '../core/errors'
import { ProjectError } from './ProjectError'
import { ProjectRulePath } from '../rules/ProjectRulePath'
import { getAdmin } from '../auth/AdminRepository'
import UserSchemaSyncJob from '../schema/UserSchemaSyncJob'
import App from '../app'

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
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProjects(params, ctx.state.admin!.id)
})

router.get('/all', async ctx => {
    ctx.body = await allProjects(ctx.state.admin!.id)
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
    const admin = await getAdmin(ctx.state.admin!.id)
    ctx.body = await createProject(admin!, payload)
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
    const { admin, project } = ctx.state
    const payload = validate(projectUpdateParams, ctx.request.body)
    ctx.body = await updateProject(project.id, admin!.id, payload)
})

subrouter.get('/data/paths', async ctx => {
    ctx.body = await ProjectRulePath
        .all(q => q.where('project_id', ctx.state.project.id))
        .then(list => list.reduce((a, { type, name, path }) => {
            if (type === 'event') {
                (a.eventPaths[name!] ?? (a.eventPaths[name!] = [])).push(path)
            } else {
                a.userPaths.push(path)
            }
            return a
        }, {
            userPaths: [],
            eventPaths: {},
        } as {
            userPaths: string[]
            eventPaths: { [name: string]: string[] }
        }))
})

subrouter.post('/data/paths/sync', async ctx => {
    App.main.queue.enqueue(UserSchemaSyncJob.from({
        project_id: ctx.state.project.id,
        // no delta, rebuild the whole thing
    }))
    ctx.status = 204
})

export { subrouter as ProjectSubrouter }
