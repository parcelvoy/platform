---
title: Client API
---

# Client API

:::info
This is the documentation for our ingestion API's which are used by our client SDKs. They can be used to create additional clients or ingest data without a secret key.
:::

## Authentication
Authentication to client endpoints is handled via public bearer API keys. These API keys allow for ingestion only of data and only on select endpoints. You can [generate a new public key](/how-to/settings/apikeys) at any time in the portal and we recommend using a separate key per platform.

To authenticate requests, set the `Authorization` header to be `Bearer YOUR_KEY` where `YOUR_KEY` is the API key you generated.

#### Example
```json
{
    "Authorization": "Bearer pk_dbf68c87-e579-4dac-b083-77fed0294e67"
}
```

## Endpoints
### Alias User
Merge a previous identifier to the users new identifier. This action can only be performed once.

#### Endpoint
`POST /api/client/alias`

#### Body
- **anonymous_id** string
- **external_id** string

#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/alias

Headers: {
    "Authorization": "Bearer pk_token_here"
}

Body: {
    "anonymous_id": "ANONYMOUS_ID",
    "external_id": "EXTERNAL_ID"
}
```

<br />

### Identify User
Create or update a user profile with associated traits.

#### Endpoint
`POST /api/client/identify`

#### Body
- **anonymous_id** string (optional)
- **external_id** string
- **email** string (optional)
- **phone** string (optional) - Phone number in E.164 format
- **timezone** string (optional) - The users timezone provided in IANA format (i.e. America/Chicago)
- **locale** string (optional) - The locale of the user use for language and formatting (i.e `es` or `en`)
- **data** object (optional)

#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/identify

Headers: {
    "Authorization": "Bearer pk_token_here"
}

Body: {
    "external_id": "EXTERNAL_ID",
    "email": "test@test.com",
    "timezone": "America/Chicago",
    "locale": "en",
    "data": {
        "first_name": "John",
        "last_name": "Smith",
        "has_completed_onboarding": true
    }
}
```

<br />

### Register Device
Ingest information about the users device including the push notification token used for sending push notifications.

#### Endpoint
`POST /devices`

#### Body
- **anonymous_id** string
- **external_id** string
- **device_id** string - A UUID or other identifier that can be used to identify this device across requests
- **token** string - The push notification token for that device
- **os** string
- **model** string
- **app_build** string - i.e. 465
- **app_version** string - i.e. 1.2.4

#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/devices

Headers: {
    "Authorization": "Bearer pk_token_here"
}

Body: {
    "external_id": "EXTERNAL_ID",
    "device_id": "5e356e66-03aa-4926-a322-d7f5c89049c1",
    "token": "45d2e0c7bbb649679723a96d92d0fa305e356e6603aa4926a322d7f5c89",
    "os": "iOS 16.3",
    "model": "iPhone15,2",
    "app_build": "465",
    "app_version": "1.2.4"
}
```


<br />

### Post Event
Track and event or interaction.

#### Endpoint
`POST /events`

#### Body
An array containing at least one object with the following parameters:

- **name** string (optional) - The name of the event
- **anonymous_id** string
- **external_id** string
- **data** object (optional)

Either an anonymous or external ID is required in order to post an event.

#### Responses
- **204** - Success
- **422** - Validation error

#### Example
```json
Endpoint: POST /api/client/events

Headers: {
    "Authorization": "Bearer pk_token_here"
}

Body: [{
    "external_id": "EXTERNAL_ID",
    "name": "Product Purchased",
    "data": {
        "product_id": 12345,
        "price": 49.99,
        "quantity": 4
    }
}]
```