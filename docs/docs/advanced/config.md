# Configuration
Find below a list of all environment variables that can be set at launch to configure different portions of the application:


### General
| key | type | required |
|--|--|--|
| BASE_URL | string | true |
| PORT | number | true |
| APP_SECRET | string | true |

### Database
| key | type | required |
|--|--|--|
| DB_HOST | string | true |
| DB_USERNAME | string | true |
| DB_PORT | number | true |
| DB_DATABASE | string | true |

### Queue
| key | type | required |
|--|--|--|
| QUEUE_DRIVER | 'sqs' or 'redis' or 'memory' | true |
| AWS_SQS_QUEUE_URL | string | If driver is SQS |
| AWS_REGION | string | If driver is SQS |
| AWS_ACCESS_KEY_ID | string | If driver is SQS |
| AWS_SECRET_ACCESS_KEY | string | If driver is SQS |
| REDIS_HOST | string | If driver is Redis |
| REDIS_PORT | string | If driver is Redis |
| REDIS_TLS | boolean | false |


### Redis
| key | type | required |
|--|--|--|
| REDIS_HOST | string | true |
| REDIS_PORT | string | true |
| REDIS_TLS | boolean | false |
| REDIS_USERNAME | string | false |
| REDIS_PASSWORD | string | false |

### Storage
| key | type | required |
|--|--|--|
| STORAGE_BASE_URL | string | true |
| STORAGE_DRIVER | 's3' or 'local' | true |
| STORAGE_S3_BUCKET | string | If driver is S3 |
| STORAGE_S3_ENDPOINT | string | false |
| STORAGE_S3_FORCE_PATH_STYLE | boolean | false |
| AWS_REGION | string | If driver is S3 |
| AWS_ACCESS_KEY_ID | string | If driver is S3 |
| AWS_SECRET_ACCESS_KEY | string | If driver is S3 |

### Auth
| key | type | required | notes
|--|--|--|
| AUTH_DRIVER | 'basic', 'google', 'openid', 'saml' | true | Can be multiple
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
| key | type | required |
|--|--|--|
| TRACKING_LINK_WRAP | boolean | false
| TRACKING_DEEPLINK_MIRROR_URL | string | false