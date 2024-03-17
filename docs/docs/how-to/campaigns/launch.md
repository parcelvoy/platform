---
title: Launch
---

# Launch a Campaign

## Blast Campaign
Once your blast campaign is designed and ready, you can send it to your targetted list. To send a campaign, hit the `Launch Campaign` button on the top right hand side. 

![Launch Campaign](/img/campaigns_launch.png "Campaigns Launch")

### Scheduling
When you are ready to launch, you can chose if you want messages to go out immediately or be scheduled for some time in the future.

#### Now
This will immediately start enqueing emails to be sent out. Selecting this option is great for anything you are ready to send but it does not allow you to abort the campaign since everything goes out immediately.

![Launch Campaign Modal](/img/campaigns_launch_modal.png)

#### Schedule
If you opt to schedule a campaign to go out in the future you can specify a time and date to begin the send. By default the date and time you select are in the projects selected timezone.

![Launch Campaign Schedule](/img/campaigns_launch_schedule.png)

##### Send In Users Timezone
You can override sending a campaign in your projects default and better target your users by utilizing the `Send In Users Timezone` functionality. To enable this, just toggle that option. We highly recommend selecting this option if you have a global userbase.

If you have this toggle selected a message will go out at the selected time in the users timezone. For example if you opt for a message to go out at 7:00am, this means that a user in Madrids message would send at 5:00 UTC wereas a user in Chicagos message would send seven hours later.

Because of variations in timezones it is important to note that you should schedule any campaigns you wish to go out in the users timezone at least 24hrs in advance otherwise the selected time for that users timezone may have already passed. If a given time has already passed, the campaign will send immediately.

### Aborting
You can abort a campaign at any time, however messages may have already been sent. Aborting a campaign happens immediately and cancels any pending sends. 

#### Restarting
If you wish to resume a campaign that has been aborted it will not resend to any users who have already received a previous message. Only users who have not received the campaign will receive a restarted campaigns message.

## Trigger Campaign
Trigger campaigns do not need to be launched and are ready to send via API as soon as you have completed setup.

You can find an example of how to send a trigger campaign on the campaigns overview screen or you can refer to our admin API documentation for further details.

- [Trigger Email Campaign Send](/api/admin#sending-email)
- [Trigger Text Message Campaign Send](/api/admin#sending-text)
- [Trigger Push Notification Campaign Send](/api/admin#sending-push)
