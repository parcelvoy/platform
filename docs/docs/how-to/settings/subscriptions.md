# Subscription Group
All communication between you and your users happens across providers, but what communications they receive is based on subscription states. You can setup as many different subscriptions as you want and what provider they go across. Users are then able to opt-in or opt-out of any given subscription to determine if they want to continue receiving that type of communication. As an example, you could setup separate subscription groups for deals vs for weekly inspiration and let the user decide to opt out of one but not the other.

## Unsubscribe
In most jurisdictions you must provide users with a way to stop receiving communications from you. To provide these options for users, use one of the options below.

### Preference Center
There is a default preference center available for users to opt out of all communication channels. The URL for this center for a given user can be accessed inside of any message that is sent by using the Handlebars variable: `{{ preferencesUrl }}`

### Email
To unsubscribe from the subscription channel that a given email is coming from you can provide users with a one-click unsubscribe link. This can be accessed via the Handlebars variable `{{ unsubscribeEmailUrl }}`

### SMS (Text Message)
If you have properly setup inbound SMS with your given provider, a user can unsubscribe by messaging the word `STOP` to the number that they have received the text message from.