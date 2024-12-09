# Twilio
## Setup
Start by creating a new account at [https://twilio.com](https://twilio.com). Once your account is created, the following steps will get your account linked to Parcelvoy

## Outbound
All you need for outbound messages is a phone number that supports SMS.

If you already have a phone number, jump to step four.
1. Go to `Develop -> Phone Numbers -> Buy a Number`
2. From here, you can pick the search criteria you care about for a number. Just make sure the number selected supports SMS (Parcelvoy will not work without it)
3. Purchase the number and copy it down.
4. Next, hit the `Account` button in the top right hand corner of the Twilio dashboard and navigate to the `General Settings -> Keys & Credentials -> API keys & tokens`.
5. Under `Auth Tokens` there should be two sets of values, live credentials and test credentials. For Parcelvoy, you need live credentials, copy them.
6. Open a new window and go to your Parcelvoy project settings
7. Navigate to `Integrations` and click the `Add Integration` button.
8. Pick Twilio from the list of integrations and enter the `Auth Token`, `Account SID` and `Phone Number` from Twilio.
9. Hit save to create the provider.

You are now setup to send SMS messages using Twilio. There is one more step however to make it fully functioning and that is to setup inbound messages so that Parcelvoy is notified of unsubscribes.

## Inbound
Setting up inbound messaging is important to comply with carrier rules and regulations regarding unsubscribing from communications. By default Twilio automatically manages [opt-outs (unsubscribes)](https://support.twilio.com/hc/en-us/articles/360034798533-Getting-Started-with-Advanced-Opt-Out-for-Messaging-Services), you just have to listen for the inbound webhook to then register that event in Parcelvoy. An additional benefit to setting up inbound messaging is that you can use the created events to trigger journeys.

To setup inbound SMS for Twilio, do the following:
1. In Twilio, navigate to `Develop -> Phone Numbers -> Manage -> Active Numbers`.
2. Pick the phone number you are using internally.
3. Scroll down to the `Messaging` section.
4. On the line item `A Message Comes In` set the type to `Webhook`, the method to `HTTP POST` and then copy the Inbound URL from your provider into that field.
5. Save the values.

Inbound Twilio notifications are now configured and unsubscribe events will register as Parcelvoy user events.
