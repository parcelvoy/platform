# iOS (Swift)

## Installation
Installing the Parcelvoy iOS SDK will provide you with user identification, deeplink unwrapping and basic tracking functionality. The iOS SDK is available through common package managers (SPM & Cocoapods) or through manual installation.

### Version Information
- The Parcelvoy iOS SDK supports
  - iOS 12.0+
  - Mac Catalyst 13.0+
- Xcode 13.2.1 (13C100) or newer

### Swift Package Manager
Go to File -> Swift Packages -> Add Package Dependency and enter:
```https://github.com/parcelvoy/ios-sdk```

## Usage
### Initialize
Before using any methods, the library must be initialized with an API key and URL endpoint.

Start by importing the Parcelvoy SDK:
```swift
import Parcelvoy
```

Then you can initialize the library:
```swift
Parcelvoy.initialize(apiKey: "API_KEY", urlEndpoint: "URL_ENDPOINT")
```

### Identify
You can handle the user identity of your users by using the `identify` method. This method either associates a given user to your internal user ID (`external_id`) or to associates attributes (traits) to the user. By default all events and traits are associated with an anonymous ID until a user is identified with an `external_id`. From that point moving forward, all updates to the user and events will be associated to your provided identifier.
```swift
Parcelvoy.shared.identify(id: "USER_ID", traits: [
    "first_name": "John",
    "last_name": "Doe"
])
```

### Events
If you want to trigger journey and list updates off of things a user does within your app, you can pass up those events by using the `track` method.
```swift
Parcelvoy.shared.track(
    event: "Event Name",
    properties: [
        "Key": "Value"
    ]
)
```

### Register Device
In order to send push notifications to a given device you need to register for notifications and then register the device with Parcelvoy. You can do so by using the `register(token: Data?)` method. If a user does not grant access to send notifications, you can also call this method without a token to register device characteristics.
```swift
Parcelvoy.shared.register(token: "APN_TOKEN_DATA")
```

### Deeplink Navigation
To allow for click tracking links in emails can be click-wrapped in a Parcelvoy url that then needs to be unwrapped for navigation purposes. For information on setting this up on your platform, please see our [deeplink documentation](https://docs.parcelvoy.com/advanced/deeplinking).

Parcelvoy includes a method which checks to see if a given URL is a Parcelvoy URL and if so, unwraps the url, triggers the unwrapped URL and calls the Parcelvoy API to register that the URL was executed.

To start using deeplinking in your app, add your Parcelvoy deployment URL as an Associated Domain to your app. To do so, navigate to Project -> Target -> Select your primary target -> Signing & Capabilities. From there, scroll down to Associated Domains and hit the plus button. Enter the domain in the format `applinks:YOURDOMAIN.com` i.e. `applinks:parcelvoy.com`.

Next, you'll need to update your apps code to support unwrapping the Parcelvoy URLs that open your app. To do so, use the `handle(universalLink: URL)` method. In your app delegate's `application(_:continue:restorationHandler:)` method, unwrap the URL and pass it to the handler:

```swift
func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {

    guard let url = userActivity.webpageURL else {
        return false
    }

    return Parcelvoy.shared.handle(universalLink: url)
}
```

Parcelvoy links will now be automatically read and opened in your application.

## Example

Explore our [example project](https://github.com/parcelvoy/ios-sdk/tree/main/Example) which includes basic usage.
