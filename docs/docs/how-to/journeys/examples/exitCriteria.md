---
title: Exit Criteria
sidebar_position: 5
---

# Exit Criteria

## Scenario
You have a long journey for user onboarding that you want to remove a user from if they have performed a certain action. You could achieve this functionality by adding a gate before every single step to check for your exit criteria, but that can be really cumbersome and you are looking to streamline the process.

![Journey Exit Criteria Example](/img/journeys_example_exit.png)

## Steps
1. Create an `Entrance` step:
    - Set the name to `Test Entrance`
    - Event based
    - Listen for any event (e.g. `Enter Test`)
    - Multiple entries is not needed
2. Add any set of additional steps to create your journey, for this example, add a delay step of one day.
3. Connect the entrance and delay steps together.
4. Add another `Entrance` step:
    - Event based
    - Listen for any criteria you want to set as "exit criteria" (e.g. `Exit Test`)
5. Add an exit step
    - Select `Test Entrance` as the entrance you want to remove a user from
6. Save

You can now run a user through the flow. When you trigger an event `Enter Test` on the user they will enter into the `Test Entrance` flow of your journey. Next if you trigger an event `Exit Test` the user will be removed from the `Test Entrance` flow with whatever step they are currently at as the latest one.

You can create as many different exit criterias as you want by just creating additional entrances with different criteria and adding additional exits. 