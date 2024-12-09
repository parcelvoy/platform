# Telnyx
## Setup
Start by creating a new account at [https://telnyx.com](https://telnyx.com). Once your account is created, the following steps will get your account linked to Parcelvoy.

## Outbound
All you need for outbound messages is a phone number that supports SMS.

If you already have a phone number, jump to step four.
1. Go to `Real-Time Communications -> Numbers -> Buy Numbers`
2. From here, you can pick the search criteria you care about for a number. Just make sure the number selected supports SMS (Parcelvoy will not work without it)
3. Purchase the number and copy it down.
4. Next, hit the `Home` button in the top left hand corner of the Telnyx dashboard and copy the `API Key` down.
5. Open a new window and go to your Parcelvoy project settings
6. Navigate to `Integrations` and click the `Add Integration` button.
7. Pick Telnyx from the list of integrations and enter the `API Key` and `Phone Number` from Telnyx.
8. Hit save to create the provider.

You are now setup to send SMS messages using Telnyx. Depending on your needs, you may need to get your number approved, etc but that is outside of this scope.

There is one more step however to make it fully functioning and that is to setup inbound messages so that Parcelvoy is notified of unsubscribes.

## Inbound
Setting up inbound messaging is important to comply with carrier rules and regulations regarding unsubscribing from communications. By default Telnyx automatically manages [opt-outs (unsubscribes)](https://support.telnyx.com/en/articles/1270091-sms-opt-out-keywords-and-stop-words), you just have to listen for the inbound webhook to then register that event in Parcelvoy. An additional benefit to setting up inbound messaging is that you can use the created events to trigger journeys.

To setup inbound SMS for Telnyx, please follow the [instructions on their website](https://support.telnyx.com/en/articles/4348981-receiving-sms-on-your-telnyx-number).