---
title: Users
sidebar_position: 3
---

# Users
This section contains a list of every single user that Parcelvoy can target. Users can be imported either via API or our client libraries. At its core, each user is a data record that contains a set of reserved properties (email, etc) as well as custom properties that you define.

## Creating Users
Please consult our documentation on our client libraries or APIs for information on how to ingest users into Parcelvoy.

## Viewing Users

## Subscription State
A user may be subscribed 

## Reserved Properties
Reserved properties are properties that are collected by default by our client libraries and are necessary in some capacity to fully utilize Parcelvoy.

#### Properties
- `anonymous_id` (string): A random identifier assigned by Parcelvoy 
- `external_id` (string): Whatever unique identifier you use for your users
- `email` (string): The primary email to reach a user by
- `phone` (string): The primary phone number to reach a user by
- `timezone` (string): The users most recent timezone
- `locale` (string): What locale the user has on their most recent device

While not all of these fields are required, they are heavily encouraged. For example, `timezone` is used to send messages at a time in the users timezone instead of them potentially coming in during the middle of the night.

The only requirement is that a user have either an anonymous or external identifier. If an external identifier is not set, an anonymous one is used. Do note however that if a user doesn't have a given piece of information required by a provider then the user cannot be sent a message (i.e. you must have a phone number to receive a text message).