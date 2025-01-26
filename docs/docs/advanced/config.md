# Configuration
Find below a list of all environment variables that can be set at launch to configure different portions of the application:


### General
| Key | Type | Required |
|--|--|--|
| BASE_URL | string | true |
| PORT | number | true |
| APP_SECRET | string | true |

### Database
| Key | Type | Required |
|--|--|--|
| DB_HOST | string | true |
| DB_USERNAME | string | true |
| DB_PORT | number | true |
| DB_DATABASE | string | true |

### Queue
| Key | Type | Required | Notes
|--|--|--|
| QUEUE_DRIVER | `sqs` or `redis` or `memory` | true |
| AWS_SQS_QUEUE_URL | string | If driver is SQS |
| AWS_REGION | string | If driver is SQS |
| AWS_ACCESS_KEY_ID | string | If driver is SQS |
| AWS_SECRET_ACCESS_KEY | string | If driver is SQS |
| REDIS_HOST | string | If driver is Redis |
| REDIS_PORT | string | If driver is Redis |
| REDIS_TLS | boolean | false |
| REDIS_CONCURRENCY | number | false | number of concurrent jobs to run


### Redis
| Key | Type | Required |
|--|--|--|
| REDIS_HOST | string | true |
| REDIS_PORT | string | true |
| REDIS_TLS | boolean | false |
| REDIS_USERNAME | string | false |
| REDIS_PASSWORD | string | false |

### Storage
See the [Storage](/advanced/storage) page for more details on how to use different storage options.

| Key | Type | Required |
|--|--|--|
| STORAGE_BASE_URL | string | true |
| STORAGE_DRIVER | `s3` or `local` | true |
| STORAGE_S3_BUCKET | string | If driver is S3 |
| STORAGE_S3_ENDPOINT | string | false |
| STORAGE_S3_FORCE_PATH_STYLE | boolean | false |
| AWS_REGION | string | If driver is S3 |
| AWS_ACCESS_KEY_ID | string | If driver is S3 |
| AWS_SECRET_ACCESS_KEY | string | If driver is S3 |

### Auth
| Key | Type | Required | Notes
|--|--|--|
| AUTH_DRIVER | `basic`, `google`, `openid`, `saml` | true | Can be multiple
| AUTH_BASIC_EMAIL | string | If driver is Basic |
| AUTH_BASIC_PASSWORD | string | If driver is Basic |
| AUTH_BASIC_NAME | string | false |
| AUTH_SAML_CALLBACK_URL | string | If driver is SAML |
| AUTH_SAML_ENTRY_POINT_URL | string | If driver is SAML |
| AUTH_SAML_ISSUER | string | If driver is SAML |
| AUTH_SAML_CERT | string | If driver is SAML |
| AUTH_SAML_IS_AUTHN_SIGNED | boolean | If driver is SAML |
| AUTH_SAML_NAME | string | false |
| AUTH_OPENID_ISSUER_URL | string | If driver is OpenID |
| AUTH_OPENID_CLIENT_ID | string | If driver is OpenID |
| AUTH_OPENID_CLIENT_SECRET | string | If driver is OpenID |
| AUTH_OPENID_REDIRECT_URI | string | If driver is OpenID |
| AUTH_OPENID_DOMAIN_WHITELIST | string | If driver is OpenID |
| AUTH_OPENID_NAME | string | false |
| AUTH_GOOGLE_ISSUER_URL | string | If driver is Google |
| AUTH_GOOGLE_CLIENT_ID | string | If driver is Google |
| AUTH_GOOGLE_CLIENT_SECRET | string | If driver is Google |
| AUTH_GOOGLE_NAME | string | false |

### Tracking
| Key | Type | Required |
|--|--|--|
| TRACKING_LINK_WRAP | boolean | false
| TRACKING_DEEPLINK_MIRROR_URL | string | false

### Error Handling
Parcelvoy supports both logging information about the system to the terminal as well as logging errors to either Bugsnag or Sentry.

| Key | Type | Required | Description
|--|--|--|--|
| LOG_LEVEL | `info`, `trace`, `warn`, `error` | false | What segment of logs to output |
| LOG_COMPILED_MESSAGE | boolean | false | Should the entire message from a send be stored in the event table |
| LOG_PRETTY_PRINT | boolean | false | Should logs pretty print to terminal |
| ERROR_DRIVER | `sentry`, `bugsnag` or `logger` | false | What error handling client to use |
| ERROR_BUGSNAG_API_KEY | string | If driver is Bugsnag | The API key to the Node.js Bugsnag project |
| ERROR_SENTRY_DSN | string | If driver is Sentry | The DNS for the Sentry Node.js project |
