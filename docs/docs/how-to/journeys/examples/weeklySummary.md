---
title: Weekly Summary
sidebar_position: 3
---

# Weely Summary

## Scenario
You have an e-commerce site and you want to sent weekly stats to all vendors that sell products through your platform, letting them know how many people viewed and purchased their products in the past 7 days.

## Steps

Create an `Entrance` step that uses the `Schedule` trigger. Configure the frequency at which you would like to have this sent out. In this case, we're sending out "Daily", but only on Mondays.

![Journey Welcome Example](/img/journeys_example_weekly_summary.png)

Create a `Send` step that uses a Webhook Campaign to call your service and load the target vendor's stats. Set a data key on the step to expose the response data (`stats` in this example).

![Journey Welcome Example](/img/journeys_example_weekly_stats_webhook.png)

Finally, create a second `Send` step that uses an Email Campaign to send the summary to your vendor.

![Journey Welcome Example](/img/journeys_example_weekly_stats_email.png)
