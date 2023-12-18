---
title: Lists
sidebar_position: 4
---

# Lists
Lists allow you to group sets of users together to target them for messages. There are two different kinds of lists:
- **Dynamic**: These lists generate themselves based on a set of criteria/rules that are set. After the initial list of users is generated, any users who fall into the criteria moving forward will find themselves added to the list.
- **Static**: These are lists that are fixed and do not change on their own. The subset of users within them comes from an uploaded CSV document.

## Static Lists
You can create lists that contain fixed data that can be uploaded via CSV. When importing data an `external_id` column is required containing the identifier for your user. Additional there are some reserved fields which enhance other functionality in the process. Anything that is not a reserved or required field will get uploaded as custom data.

### Required Fields:
- `external_id`: The unique identifier for that user

### Reserved Fields:
- `first_name`: The first name of the user
- `last_name`: The last name of the user
- `email`: The users email
- `phone`: The users phone number with country code
- `timezone`: The users timezone provided in IANA format (America/Chicago)