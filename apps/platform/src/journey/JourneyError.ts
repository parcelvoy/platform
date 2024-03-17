import { ErrorType } from '../core/errors'

export default {
    JourneyDoesNotExist: {
        message: 'The requested journey does not exist or you do not have access.',
        code: 9000,
        statusCode: 400,
    },
    JourneyStepDoesNotExist: {
        message: 'The request journey step is invalid',
        code: 9001,
        statusCode: 400,
    },
} as Record<string, ErrorType>
