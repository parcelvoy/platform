# Mailgun

## Outbound
1. Open the [Mailgun console](https://app.mailgun.com) and go to `Sending -> Domains`
2. Hit `Add New Domain`
3. Enter the domain you want to add and setup the correct DNS records. For more instructions follow [Mailguns setup guide](https://documentation.mailgun.com/en/latest/quickstart-sending.html#add-receiving-mx-records)
4. Navigate to `Domain settings -> Sending API keys`
5. Hit `Add sending key` and pick a description and submit
6. Copy the provided API key
7. Open a new window and go to your Parcelvoy project settings
8. Navigate to `Integrations` and click the `Add Integration` button.
9. Pick `Mailgun` from the list of integrations and enter the `sending api key` (API key) and `domain` in the provided fields.
10. Hit save to create the provider.

## Inbound
Email sending is not the only important part, you also need to keep track of things like email opens, clicks, unsubscribes, bounces and complaints. Parcelvoy automatically takes care of opens, clicks and unsubscribes for you, but bounces and complaints require webhooks from Mailgun.

To setup inbound webhooks, do the following:
1. Open the [Mailgun console](https://app.mailgun.com) and go to `Sending -> Webhooks`
2. Pick the domain you will be using in the top right and then click `Add Webhook`
3. Select `Permanent Failure` and enter the Parcelvoy Mailgun unsubscribe URL for your provider (which can be found on the provider details screen)
4. Hit `Create Webhook`
5. Repeat this process two more times for the webhook event types `Temporary Failure` and `Spam Complaints`
6. You can optionally copy the HTTP webhook signing key to make the process more secure. We recommend doing this as it takes little to no effort. You can find this key on the right hand side of that same page, just enter it on the Parcelvoy provider under Webhook Signing Key and hit save.

## Related Links
https://documentation.mailgun.com/en/latest/quickstart-sending.html#send-via-smtp
https://www.mailgun.com/blog/product/a-guide-to-using-mailguns-webhooks/