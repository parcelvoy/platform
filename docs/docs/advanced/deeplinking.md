# Deeplinking

If you are wanting to use universal links and link wrapping together, you will need to configure Parcelvoy appropriately.

Both Apple and Google require a domain with HTTPS as well as a file be present on that domain ([apple-app-site-association file (iOS)](https://developer.apple.com/library/archive/documentation/General/Conceptual/AppSearch/UniversalLinks.html) and [assetlinks.json file (Android)](https://developer.android.com/training/app-links/verify-site-associations)). Link wrapping a universal link wraps the URL in the Parcelvoy URL which could cause universal links to stop opening in app. To solve this, Parcelvoy supports proxing those files from a remote source so that they are always present when your app requests them.

To setup link wrapping all you have to do is provide as an environment variables the URL at which you already have the two files hosted under `.well-known`.

```
TRACKING_DEEPLINK_MIRROR_URL=https://your-domain-here.com
```

If you wish instead to turn link wrapping off entirely, you can do so as well.

```
TRACKING_LINK_WRAP=false
```