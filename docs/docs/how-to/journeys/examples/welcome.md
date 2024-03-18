---
title: Welcome Emails
sidebar_position: 1
---

# Welcome Emails

## Scenario
You want to send people that sign up for your product or service a basic welcome email that lets them know how to get started.

![Journey Welcome Example](/img/journeys_example_welcome.png)

## Steps
1. Create an `Entrance` step:
    - event-based
    - listen your new user signup event (e.g. `User Created`)
    - use Rules to only add users with email address defined
    - multiple entries is not needed
    - (optional) set a data key to expose any signup information captured
2. Connect it to a `Send` step that uses an Email campaign
