---
title: Reservations
sidebar_position: 2
---

## Scenario
Lets say you have a journey to send a user a reminder to check into their flight 24hrs before its departure. You can setup a journey to trigger when a `Ticket Purchased` event goes off, use the timestamp on that event for when the flight is scheduled to depart to configure a delay and then send a notification to the user with details from the original event data.

![Journey Airline Example](/img/journeys_airline.png)

## Steps
- Create a journey `Entrance` and set it to trigger bassed on an event (i.e. `Ticket Purchased`)
- Set the `Data Key` parameter of this entrance to a value so you can reference this step later (i.e. `entrance`)
- Add a `Delay` step and pick the `Until Date` type. For the value, use a [Handlebars function](/how-to/campaigns/templates) to subtract one day from the date of the flight. To get this date, use the `journey` variable name and reference the data of the entrance by using its data key (i.e. `entrance`). So for example `journey["entrance"].flight_data` would get the value of `flight_data` from the step with `Data Key` `entrance`.
- Create a `Send` step and build the email to go out. You can continue to reference the variable `journey` in the email you build to fill in details such as flight number, etc.
