---
title: Journeys
sidebar_position: 1
pagination_prev: null
pagination_next: null
custom_edit_url: null
---

import Card from '@site/src/components/Card'
import Cards from '@site/src/components/Cards'

# Journeys

## Overview
Journeys are configurable sequences of automated actions that help you add personalization to your communications. Journeys are composed of `Steps`. Users will enter at a given `Entrance` step and progress until they run out of next steps. Each `Journey` can have multiple `Entrance` steps that can share common sequences of steps.

## Journey Step Types
- **Action** - trigger `campaign` sends (email, sms, push notifications, or webhooks).
- **Delay** - wait for a duration or until a specific date or time before proceeding.
- **Entrance** - entry point into the `Journey` that can be triggered by events, schedules, or by other `Journeys` with `Link` steps.
- **Experiment** - randomly send users down multiple paths for A/B testing purposes.
- **Gate** - send the user down different paths depending on whether they match a configurable rule.
- **Link** - add users to other journeys, or restart the current journey.
- **Update** - modify the current user's profile data.
