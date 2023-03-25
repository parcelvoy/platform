# Authentication
Parcelvoy comes with a few different types of authentication out of the box:
- Basic
- SAML
- OpenID

Whereas a lot of platforms will gate SSO as a luxury feature and charge extra for it (this is known as the ***SSO Tax***) we opted to go the opposite direction and lean in completely to SSO to make sure you understand that Parcelvoy takes your security seriously. SSO is not something that only Enterprise companies should have, but should be available at every level.

## Basic
Right out of the gate Parcelvoy is setup to use a simple ***Basic*** auth that allows for a single user that can be set inside of the environment variables. This is a limited form of auth as it does not allow for multiple users and is largely meant for evaluation purposes.

To change the credentials for basic auth, modify the following environment variables and restart your Parcelvoy instance.
```
AUTH_BASIC_USERNAME=parcelvoy
AUTH_BASIC_PASSWORD=password
```


## SAML
***Instructions coming soon.***

### Config
| key | type | required |
|--|--|--|
| AUTH_DRIVER | 'saml' | true |
| AUTH_SAML_CALLBACK_URL | string | true |
| AUTH_SAML_ENTRY_POINT_URL | string | true |
| AUTH_SAML_ISSUER | string | true |
| AUTH_SAML_CERT | string | true |
| AUTH_SAML_IS_AUTHN_SIGNED | boolean | false |

## OpenID
***Instructions coming soon.***

### Config
| key | type | required |
|--|--|--|
| AUTH_DRIVER | 'openid' | true |
| AUTH_OPENID_ISSUER_URL | string | true |
| AUTH_OPENID_CLIENT_ID | string | true |
| AUTH_OPENID_CLIENT_SECRET | string | true |
| AUTH_OPENID_REDIRECT_URI | string | true |
| AUTH_OPENID_DOMAIN_WHITELIST | string | true |

### Google Workspace
You can utilize either SAML or OpenID to connect to your Google Account. We'll be highlighting how to setup SAML as it is slightly easier than OpenID to configure.

***Instructions coming soon.***
