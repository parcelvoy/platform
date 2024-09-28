# JS

## Installation
To install the SDK, use Yarn, npm, or a script tag:

- npm
```
npm install @parcelvoy/js-sdk
```

- Yarn
```
yarn add @parcelvoy/js-sdk
```

script tag

```
<script src="https://unpkg.com/@parcelvoy/js-sdk/lib/esm/index.js"></script>
```

## Usage
The SDK can be used both on the server or in the web browser. The main difference is that on the Browser the identified user will be cached vs in Node where you'll need to pass in identifiers on every request.

### Initialize
Before using any methods, the library must be initialized with an API key and URL endpoint.

If you aren't accessing the SDK via script tag, start by importing the Parcelvoy SDK:
```typescript

// 
const { Client /** or BrowserClient */ } = require('@parcelvoy/js-sdk')

// Or
import { Client /** or BrowserClient */ } from '@parcelvoy/js-sdk'
```

Then you can initialize the library:
```typescript
// Node
const client = new Client({
    apiKey: "XXX-XXX",
    urlEndpoint: "https://app.parcelvoy.com/api"
})

// Browser
const client = new BrowserClient({
    apiKey: "XXX-XXX",
    urlEndpoint: "https://app.parcelvoy.com/api"
})

// Or global script
Parcelvoy.initialize({
    apiKey: "XXX-XXX",
    urlEndpoint: "https://app.parcelvoy.com/api"
})
```

### Identify
You can handle the user identity of your users by using the `identify` method. This method works in combination to either/or associate a given user to your internal user ID (`external_id`) or to associate attributes (traits) to the user. By default all events and traits are associated with an anonymous ID until a user is identified with an `external_id`. From that point moving forward, all updates to the user and events will be associated to your provider identifier.
```typescript

// Client
client.identify({
    externalId: "XXX-XXX"
    phone: "+1234567890"
    email: "email@email.com"
    traits: {}
})

// Or global script
Parcelvoy.identify({
    externalId: "XXX-XXX"
    phone: "+1234567890"
    email: "email@email.com"
    traits: {}
})
```

### Events
If you want to trigger a journey and list updates off of things a user does within your app, you can pass up those events by using the `track` method.
```typescript

// Client
client.track({
    event: "Tapped Button"
    traits: {
        "Key": "Value"
    }
})

// Or global script
Parcelvoy.track({
    event: "Tapped Button",
    traits: {
        "Key": "Value"
    }
})
```
