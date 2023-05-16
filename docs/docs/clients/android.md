# Android

## Installation
Installing the Parcelvoy Android SDK will provide you with user identification, deeplink unwrapping and basic tracking functionality. The Android SDK is available through jitpack or through manual installation.

### Version Information
- The Parcelvoy Android SDK supports SDK 21+

### Install the SDK
In your **build.gradle** add:
```
dependencies {
    implementation 'com.github.parcelvoy:android-sdk:0.1.4'
}
```

## Usage
### Initialize
Before using any methods, the library must be initialized with an API key and URL endpoint.

Initialize the library:
```kotlin
val analytics = Parcelvoy.initialize(context, YOUR_API_KEY, YOUR_URL_ENDPOINT)
```

### Identify
You can handle the user identity of your users by using the `identify` method. This method either associates a given user to your internal user ID (`external_id`) or to associates attributes (traits) to the user. By default all events and traits are associated with an anonymous ID until a user is identified with an `external_id`. From that point moving forward, all updates to the user and events will be associated to your provided identifier.
```kotlin
analytics.identify(
    id = USER_ID,
    traits = mapOf(
        "first_name" to "John",
        "last_name" to "Doe"
    )
)
```

### Events
If you want to trigger journey and list updates off of things a user does within your app, you can pass up those events by using the `track` method.
```kotlin
analytics.track(
    event = "Application Opened",
    properties = mapOf("property" to true)
)
```

### Register Device
In order to send push notifications to a given device you need to register for notifications and then register the device with Parcelvoy. You can do so by using the `register` method. If a user does not grant access to send notifications, you can also call this method without a token to register device characteristics.
```kotlin
analytics.register(
    token = token,
    appBuild = BuildConfig.VERSION_CODE,
    appVersion = BuildConfig.VERSION_NAME
)
```

### Deeplink Navigation
To allow for click tracking links in emails can be click-wrapped in a Parcelvoy url that then needs to be unwrapped for navigation purposes. For information on setting this up on your platform, please see our [deeplink documentation](https://docs.parcelvoy.com/advanced/deeplinking).

Parcelvoy includes a method which checks to see if a given URL is a Parcelvoy URL and if so, unwraps the url, triggers the unwrapped URL and calls the Parcelvoy API to register that the URL was executed.

To start using deeplinking in your app, add your Parcelvoy deployment URL in your activity `intent-filter`. Example in the sample project [dere](https://github.com/parcelvoy/android-sdk/tree/main/samples/kotlin-android-app/src/main/AndroidManifest.xml).

Next, you'll need to update your apps code to support unwrapping the Parcelvoy URLs that open your app. To do so, use the `getUriRedirect(universalLink)` method. In your app delegate's `onNewIntent(intent)` method, unwrap the URL and pass it to the handler:

```kotlin
override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)

    val uri = intent?.data
    if (uri != null) {
        val redirect = analytics.getUriRedirect(uri)
    }
}
```

Parcelvoy links will now be automatically read and opened in your application.

## Example

Explore our [example project](https://github.com/parcelvoy/android-sdk/tree/main/samples/kotlin-android-app) which includes basic usage.