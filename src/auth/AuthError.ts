export default {
    InvalidRefreshToken: {
        message: 'The refresh token provided is invalid.',
        code: 1000,
    },
    SAMLValidationError: {
        message: 'Unable to parse response from SSO.',
        code: 1001,
    },
    AdminNotFound: {
        message: 'The admin user matching the provided criteria does not exist.',
        code: 5002,
    },
    InvalidDomain: {
        message: 'The provided email does not have access to access this site.',
        code: 5003,
    },
    InvalidEmail: {
        message: 'The email address provided is invalid or not present.',
        code: 5004,
    },
}
