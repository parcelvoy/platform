---
title: Lists
sidebar_position: 4
---

# Lists
Lists allow you to group sets of users together to target them for campaigns. There are two different kinds of lists:
- **Dynamic**: These lists generate themselves based on a set of criteria/rules that are set. After the initial list of users is generated, any users who fall into the criteria moving forward will find themselves added to the list.
- **Static**: These are lists that are fixed and do not change on their own. The subset of users within them comes from an uploaded CSV document.

## Dynamic Lists
You can create a dynamic list by building a ruleset to target which users you want to be included. After creating your initial ruleset, the criteria is run across all users to build the initial list (this process can take some time depending on the number of users you have). Once the initial list is built, additions and substractions from the list happen instantly based on inbound events and user property updates.

### Rules
Rules can target both events and user properties using JSON dot notation and involves matching a property or event to a provided value. Values can be cast to different types allowing for different operations. The primary data types are:
- Strings
- Numbers
- Booleans
- Dates
- Arrays

The value field for each part of a ruleset accepts [Handlebars and all associated functions](/how-to/campaigns/templates#helpers).

#### Using Relative Dates
List membership primarily operates off of inbound events and user property updates. Membership generated in this fashion is instant and really efficient. However, sometimes membership needs to be determined based on relative values. An example of this might be a list that only includes users who have performed an action without a given period of time. To achieve this, you can use [date math and Handlebars functions](/how-to/campaigns/templates#dates).

To use relative dates, pick the `Date` data type for an event ruleset filter and then use the `{{ now }}` value along with date match to generate the date you are looking for. An example of this might be `{{ subDate "now" 30 "days" }}`.

Once you save, Parcelvoy automatically detects dynamic parameters in your ruleset and will recalculate membership once daily. 

:::caution
Where possible, Parcelvoy attempts to efficiently re-evaluate membership in your list but depending on your logic this may not be possible and a full list re-generation may occur. This primarily happens when using relative dates and a `before` operator since all users not in the list must also be evaluated.
:::


## Static Lists
You can create lists that contain fixed data that can be uploaded via CSV. When importing data an `external_id` column is required containing the identifier for your user. Additional there are some reserved fields which enhance other functionality in the process. Anything that is not a reserved or required field will get uploaded as custom data.

### Required Fields:
- `external_id`: The unique identifier for that user

### Reserved Fields:
- `first_name`: The first name of the user
- `last_name`: The last name of the user
- `email`: The users email
- `phone`: The users phone number in E.164 format
- `timezone`: The users timezone provided in IANA format (i.e. America/Chicago)
- `locale`: The locale of the user use for language and formatting (i.e `es` or `en`)
- `created_at`: When a user was created to override internal time setting. Must be in ISO 8601 format