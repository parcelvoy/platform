import { ErrorType } from '../core/errors'

export const ProjectError = {
    ProjectDoesNotExist: {
        message: 'The requested project does not exist.',
        code: 6000,
        statusCode: 404,
    },
    ProjectAccessDenied: {
        message: 'You do not have permission to access this project.',
        code: 6001,
        statusCode: 403,
    },
} satisfies Record<string, ErrorType>
