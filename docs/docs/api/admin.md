---
title: Admin API
---

# Admin API

:::info
Full documentation on our `admin` API is coming soon, currently only pertinent API's are listed below.
:::

## Authentication
Authentication to admin endpoints is handled via secret bearer API keys. These API keys allow for ingestion only of data and only on select endpoints. You can [generate a new secret key](/how-to/settings/apikeys) at any time in the portal.

To authenticate requests, set the `Authorization` header to be `Bearer YOUR_KEY` where `YOUR_KEY` is the API key you generated.

#### Example
```json
{
    "Authorization": "Bearer sk_dbf68c87-e579-4dac-b083-77fed0294e67"
}
```

## Campaigns

### Sending Email
Trigger an email to be sent to a given user via API.

#### Endpoint
`POST /api/client/campaigns/:campaignId/trigger`

#### Body
- **user** object
    - **external_id** string
    - **email** string
    - **timezone** string (optional)
    - **locale** string (optional)
- **event** object (optional)


#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/campaigns/44/trigger

Headers: {
    "Authorization": "Bearer sk_token_here"
}

Body: {
    "user": {
        "external_id": "EXTERNAL_ID",
        "email": "test@test.com",
        "timezone": "America/Chicago",
        "locale": "en",
    },
    "event": {
        "random_field": "value"
    }
}
```

<br />

### Sending Text Message
Trigger an SMS text message to be sent to a given user via API.

#### Endpoint
`POST /api/client/campaigns/:campaignId/trigger`

#### Body
- **user** object
    - **external_id** string
    - **phone** string
    - **timezone** string (optional)
    - **locale** string (optional)
- **event** object (optional)


#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/campaigns/44/trigger

Headers: {
    "Authorization": "Bearer sk_token_here"
}

Body: {
    "user": {
        "external_id": "EXTERNAL_ID",
        "phone": "+12345678900",
        "timezone": "America/Chicago",
        "locale": "en",
    },
    "event": {
        "random_field": "value"
    }
}
```

<br />

### Sending Push Notification
Trigger an push notification to be sent to a given user via API.

#### Endpoint
`POST /api/client/campaigns/:campaignId/trigger`

#### Body
- **user** object
    - **external_id** string
    - **device_token** string
    - **timezone** string (optional)
    - **locale** string (optional)
- **event** object (optional)


#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/campaigns/44/trigger

Headers: {
    "Authorization": "Bearer sk_token_here"
}

Body: {
    "user": {
        "external_id": "EXTERNAL_ID",
        "device_token": "DEVICE_TOKEN",
        "timezone": "America/Chicago",
        "locale": "en",
    },
    "event": {
        "random_field": "value"
    }
}
```

<br />
