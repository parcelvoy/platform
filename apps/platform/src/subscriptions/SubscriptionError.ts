import { ErrorType } from 'core/errors'

export default {
    UnsubscribeFailed: {
        message: 'Unable to unsubscribe, either the user or subscription type do not exist!',
        code: 4000,
    },
    UnsubscribeInvalidUser: {
        message: 'User does not exist!',
        code: 4001,
        statusCode: 404,
    },
    UnsubscribeInvalidCampaign: {
        message: 'Campaign does not exist!',
        code: 4002,
        statusCode: 404,
    },
} satisfies Record<string, ErrorType>
