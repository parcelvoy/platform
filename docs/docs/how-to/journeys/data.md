---
title: Accessing Data
sidebar_position: 2
---

# Accessing Data
In order to personalize a Journey, you will likely need to dynamically access user data, events, and data captured at other steps in the Journey.

This is the base data structure available in Journey (and Send step Campaign) processing:
```json
{
    // the user that is running through the journey:
    "user": {
        // standard profile fields and contact info
        "id": "abc123",
        "email": "chris@example.com",
        "phone": "+01234567890",
        "locale": "en",
        "timezone": "America/Chicago",
        "created_at": "2024-01-01T00:00:00Z",
        // all custom fields associated with the user
        "favorite_color": "green",
        "favorite_beverage": "espresso",
        "guitars": ["fender", "strandberg"]
    },
    // data collected during the journey, stored as a map based on the Data Key field
    "journey": {
        // event-based entrances can capture the event that started the journey
        "data_key_from_entrance": {
            "event": {
                // standard properties
                "name": "Purchased Coffee",
                "created_at": "2024-03-01:12:30:00Z",
                // all custom fields associated with the event
                "price": 3.00,
                "size": "XXXL",
                "roomForCream": false
            }
        },
        // Send steps that use webhooks can also store the response
        "data_key_from_webhook_send": {
            "response": {
                "total_reward_points": 300,
                "remaining_balance": 150
            }
        }
    }
}
```

To make stored step data available to subsequent steps, specify the Data Key:

![Journey Data Key Example](/img/journeys_data_key.png)

Gate steps can then access that data under `journey.DATA_KEY.*` (in this example, `journey.data_key_from_webhook_send.total_reward_points`).

![Journey Data Key Gate Example](/img/journeys_data_key_gates.png)

Similarly, step data can be copied into the user profile:

![Journey Data Key User Update Example](/img/journeys_data_key_user_updates.png)

Also in campaign templates:

![Journey Data Key Campaigns Example](/img/journeys_data_key_campaigns.png)
