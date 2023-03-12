# Twilio
## Setup
Start by creating a new account at [https://twilio.com](https://twilio.com).

After you've created an account, hit the `Account` button in the top right hand corner of the Twilio dashboard and navigate to the `General Settings -> Keys & Credentials -> API keys & tokens`. Under `Auth Tokens` there should be two sets of values, live credentials and test credentials. For Parcelvoy, you need live credentials.

Open a new window and go to your Parcelvoy project settings. Navigate to `Integrations` and click the `Add Integration` button, followed by picking Twilio from the list. Enter the `Auth Token` and `Account SID` from the Twilio window. Next, we will purchase a phone number.

## Outbound
All you need for outbound messages is a phone number that supports SMS.
To purchase a new phone number, go to `Develop -> Phone Numbers -> Buy a Number`. From here, you can pick the search criteria you care about for a number. In order for Parcelvoy to work, just make sure it has SMS listed as a capability. You will not be able to send messages without it. 

After you've purchased the number, enter it in the configuration on your Parcelvoy provider and hit save to create.

## Inbound
By default Twilio automatically manages [opt-outs (unsubscribes)](https://support.twilio.com/hc/en-us/articles/360034798533-Getting-Started-with-Advanced-Opt-Out-for-Messaging-Services), you just have to listen for the inbound webhook to then register that event in Parcelvoy.

To setup inbound SMS for Twilio, go to `Develop -> Phone Numbers -> Manage -> Active Numbers` and pick the phone number you are using internally. From there scroll down to the `Messaging` section. On the enter  `A Message Comes In` set the type to `Webhook`, the method to `HTTP POST` and then the URL to the following:

```
https://yourdomain.com/api/unsubscribe/sms
```

Where `yourdomain.com` is replaced with whatever domain you are running Parcelvoy under.
