# Sendgrid

## Outbound
1. Open the [Sendgrid console](https://app.sendgrid.com) and go to `Sending -> Marketing -> Senders`
2. Enter all of the required fields. Make sure the email you enter is the one you are going to be sending from.
3. Navigate to `Email API -> Integration Guide`. You are welcome to chose either option, but for the `SendGrid` integration you must chose the `Web API` option.
4. Select cURL from the list and under the provided steps, create a new API key.
5. Copy the provided API key
7. Open a new window and go to your Parcelvoy project settings
8. Navigate to `Integrations` and click the `Add Integration` button.
9. Pick `SendGrid` from the list of integrations and enter the API Key you just generated in the field.
10. Hit save to create the provider. If you want to verify it can send, create a campaign and send a proof email to yourself.

## Inbound
Email sending is not the only important part, you also need to keep track of things like email opens, clicks, unsubscribes, bounces and complaints. Parcelvoy automatically takes care of opens, clicks and unsubscribes for you, but bounces and complaints require webhooks from SendGrid.

To setup inbound webhooks, do the following:
1. Open the [SendGrid console](https://app.sendgrid.com) and go to `Sending -> Mail Settings -> Webhook Settings`
2. Hit `Create new webhook`
3. Enter the Parcelvoy SendGrid unsubscribe URL for your provider (which can be found on the provider details screen)
4. Under `Actions to be posted` select `Spam Reports`, `Dropped` and `Bounced`
5. Hit `Create Webhook`


## Related Links
https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook
https://docs.sendgrid.com/for-developers/tracking-events/twilio-sendgrid-event-webhook-overview