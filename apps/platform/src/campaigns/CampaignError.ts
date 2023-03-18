import { ErrorType } from '../core/errors'

export default {
    CampaignDoesNotExist: {
        message: 'The requested campaign does not exist or you do not have access.',
        code: 2000,
        statusCode: 400,
    },
    CampaignFinished: {
        message: 'The campaign has already finished and cannot be modified.',
        code: 2001,
        statusCode: 400,
    },
} as Record<string, ErrorType>
