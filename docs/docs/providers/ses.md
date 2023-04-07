# SES
Amazon SES is quite possibly the most cost effective email service available. If you are sending high volumes of emails it is highly recommended, but it does require some extra setup.
## Setup

### Requesting Approval
Once you are ready to use SES you must request approval to send emails in production. In general it is recommended you try and request access earlier than later as you may be denied. The process usually does not take longer than a day, but providing lots of context is important.

To request access, do the following:
1. Navigate to the [AWS SES portal](https://console.aws.amazon.com/ses/home)
2. On your account dashboard you should see an alert informing you that your account is in sandbox mode. Hit the `Request Production Access` button.
3. Fill out the form with the details of your product and submit. The more details the better as it will improve your chances of being approved.

## Outbound
### Create Verified Identity
1. From the SES portal, navigate to `Verified Identities`
2. Click `Create Identity`
3. In general for Parcelvoy you will want the flexibility of sending emails from any address, so we recommend picking the `Domain` entity type.
4. Next, enter the domain you want to use for sending emails. In general it is recommended that you use a subdomain to prevent your primary emails reputation score (which may house your company emails) being affected by any marketing or transaction emails you send.
5. Follow the instructions on how to verify your domain as well as setup DKIM for email security.
6. Hit create. Once created, SES will verify your domain to make sure it is setup correctly.

### Setup Integration
1. Navigate to `IAM` in the AWS portal
2. Go to `Users` and hit `Create User`
3. Pick a random username for your user and hit `Next`
4. If you have existing groups that cover the permissions necessary use that, otherwise select `Attach policies directly` under `Permission Options`
6. Search for `AmazonSES` and select `AmazonSESFullAccess` from the list
7. Hit `Next` and then `Create User`
8. Navigate to your newly created user and then to the `Security Credentials` tab
9. Under `Access Keys` hit `Create Access Key`
10. From the provided best practices list, pick `Application running outside AWS` and hit `Next` then `Create Access Key`
11. Save the provided access key and secret access key
12. Open a new window and go to your Parcelvoy project settings
13. Navigate to `Integrations` and click the `Add Integration` button.
14. Pick `Amazon SES` from the list of integrations and enter the `Access Key Id` (access key) and `Secret Access Key` in the provided fields.
15. To determine your region, navigate back to SES and look at the URL bar. The first part before `console.aws.amazon.com` is your region (i.e. `us-east-1`). Enter the region in the appropriate field.
16. Hit save to create the provider.

## Inbound
Email sending is not the only important part, you also need to keep track of things like email opens, clicks, unsubscribes, bounces and complaints. Parcelvoy automatically takes care of opens, clicks and unsubscribes for you, but bounces and complaints require notifications from SES.

To setup inbound notifications, do the following:
1. Open the [Amazon SNS console](https://console.aws.amazon.com/sns/home) and choose `Topics`.
2. On the Topics page, choose Create topic.
3. In the `Details` section of the Create topic page, choose Standard for type and provider a name. 
4. Choose `Create topic`
5. From the Topic details of the topic that you created, choose `Create subscription`
6. For Protocol, select `HTTPS` and enter the Parcelvoy SES unsubscribe URL for your provider (which can be found on the provider details screen)
7. Hit save
8. Navigate to the [SES console](https://console.aws.amazon.com/ses/home) and choose `Verified identities`
9. Select your previously created identity and go to the `Notifications` tab.
10. Disable Email feedback forwarding
11. Under Feedback notifications, hit `Edit`
12. For `Bounce feedback` and `Complaint feedback` select the SNS topic you previously created and check the `Include original email headers` checkboxes.
13. Hit save changes and you are all set!