---
title: Recurring Reminder
sidebar_position: 4
---

# Recurring Reminder

## Scenario
You have an e-learning website that allows students to submit assignments and instructors to grade them and give feedback. When a student submits an assignment, you want to prompt the corresponding instructor to complete the grading, then notify the student that it is ready.

## Steps
First, create a Journey for the instructor's side of the experience. Start with an event-based `Entrance` step that listens for an `Assignment Submitted` event:

```json
{
    "name": "Assignment Submitted",
    "data": {
        "assignment_id": "xyz789",
        "submitted_date": "2024-03-18T12:30:00Z"
    }
}
```

Expose the event data to subsequent steps under the key `assignments`.

![Journey Reminder Example](/img/journeys_example_reminder.png)

Next, notify the instructor that the assignment is ready to grade with an email `Send` step.

Add a `Delay`, then check the status with a webhook `Send` to see if the instructor has completed the grading. Expose the response data from this step with a data key called `status`.

Check the `status` data to see if the grading was completed. If not completed, send another reminder and look back to the `Delay` step from early to repeat the process.
