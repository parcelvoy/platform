# Templates
Each campaign has a Handlebars template associated to it to help render the final message that is sent to the end user. Each template contains the structure of the design or message as well as placeholders for variables that will be filled in for every user that it is sent to.

## Getting Started
Parcelvoy has four different types of templates:
- Email
- Text Message
- Push Notification
- Webhooks

Each of which has fields that are rendered as Handlebars templates. They can be customized using a combination of variables and functions.

### Template Types:
#### Email
Email templates are comprised of various fields that are related to the email experience such as `subject`, `body`, `cc`, etc. Each field on the template allows you to use Handlebars to modify the end result. Additionally the `html` field is sent to the user to be rendered as HTML and will display any styles included.

#### Text Message
A text message template is largely just a single field that is broken up into pieces based on its content length. Bare in mind that any Handlebars variables that are filled in will be of variable length and could cause the total content length to grow.

#### Push Notification
Similar to text messages, a push notification is mainly just a piece of text but can also contain a JSON body as well as a title. All fields can be customized using Handlebars to include functions and variables.

#### Webhooks
Webhook templates are a wrapper around an HTTP REST request. You can customize headers and body parameters to send a request to pretty much any endpoint you can think of. The `body` and `headers` fields accept objects, but are not rendered as strings. Each key in each object is instead, so Handlebars is only interpreted at the value level of each key.

### Variables
Depending on the incoming data each template will have access to a `user` object and an optional `event` object.

They can be accessed by key and properties inside of each are accessed using dot notation.

```
{{ user.email }}
// or
{{ event.custom_property }}
```

Templates will always have access to the user, but the event property will only have a value if the template is being rendered as a result of an event triggering an action.

In general, we recommend using snake case for properties to be consistent, but there is no rule that says you cant use something else.

All user objects will at a minimum have a series of constant fields present (although they may be null) as well as any custom fields you add to the user.
```json
// User Object
{
    "id": "YOUR_EXTERNAL_ID",
    "email": "abc@example.com",
    "phone": "+11234567890",
    "locale": "en",
    "timezone": "America/Chicago"
}
```


## Helpers
Alongside being able to access variables using Handlebars, you can also modify values using custom helpers. We've included a list of them below.

### Equality
#### Compare
There is a general equality function `compare` which lets you check if two values match an operator. Available operators are `==`, `===`, `!=`, `!==`, `<`, `>`, `<=` and `>=`.
```handlebars
{{ compare "a" "==" "b" }}
```

#### Equals
```handlebars
{{ eq "a" "b" }}
```

#### Not Equals
```handlebars
{{ nq "a" "b" }}
```

#### Less Than
```handlebars
{{ lt "a" "b" }}
```

#### Greater Than
```handlebars
{{ gt "a" "b" }}
```

#### Less Than or Equal To
```handlebars
{{ lte "a" "b" }}
```

#### Greater Than or Equal To
```handlebars
{{ gte "a" "b" }}
```

#### Or
The `or` function lets you group chunks of logic together by checking if any of the included chunks are true.
```handlebars
{{#if (or 
        (eq section1 "foo")
        (ne section2 "bar"))}}
... content
{{/if}}
```

#### And
The `and` function lets you group chunks of logic together by checking if all of the included chunks are true.
```handlebars
{{#if (and 
        (eq section1 "foo")
        (ne section2 "bar"))}}
... content
{{/if}}
```

### Strings
#### Append
Appends the given `string` with the specified `suffix`.
```handlebars
{{ prepend "The word that means come after is" "append" }} // = `The word that means come after is append`
```

#### Camelcase
camelCase the characters in the given `string`.
```handlebars
{{ camelcase "snake_case_string" }} // = `snakeCaseString`
```

#### Capitalize
Capitalize the first word in a sentence.
```handlebars
{{ capitalize "this is a sentence" }} // = `This is a sentence`
```

#### Capitalize All
Capitalize all words in a string.
```handlebars
{{ capitalizeAll "this is a sentence" }} // = `This Is A Sentence`
```

#### Ellipsis
Truncates a string to the specified `length`, and appends it with an el;ipsis, `…`.
```handlebars
{{ ellipsis "very long string" 4 }} // = `very...`
```

#### Lowercase
Lowercase all characters in the given string.
```handlebars
{{ lowercase "UPPERCASE" }} // = `uppercase`
```

#### Occurences
Return the number of occurrences of `substring` within the given `string`.
```handlebars
{{ occurences "this and that and those" "and" }} // = `2`
```

#### Prepend
Prepends the given `string` with the specified `prefix`.
```handlebars
{{ prepend "means come before" "Prepend" }} // = `Prepend means come before`
```

#### Replace
In a given piece of text, replace all occurrences of substring `a` with substring `b`.
```handlebars
{{ replace "one two three four" " " ", " }} // = `one, two, three, four`
```

#### Replace First
Replace the first occurrence of substring `a` with substring `b`.
```handlebars
{{ replaceFirst "one two three four" " " ", " }} // = `one, two three four`
```

#### Reverse
Reverses a string.
```handlebars
{{ reverse "abcd" }} // = `dcba`
```

#### Snakecase
Converts a given string to snake case (i.e. snake_case)
```handlebars
{{ snakecase "camelCaseText" }} // = `camel_case_text`
```

#### Split
Split a piece of text into an array on the given `character`.
```handlebars
{{ split "one two three" " " }} // = `Array[one, two, three]`
```

#### Starts With
Tests whether a string begins with the given prefix.
```handlebars
{{ startsWith "Peter" "Pet" }} // = `true`
```

#### Trim
Removes extraneous whitespace from the beginning and end of a string.
```handlebars
{{ trim " text " }} // = `text` (no space before or after)
```

#### Truncate
Truncate a string to the specified `length`
```handlebars
{{ truncate "This is a long piece of text" 4 }} // = `This`
```

#### Truncate Words
Truncate a string to have the specified number of words.
```handlebars
{{ trucateWords "This is a long piece of text" 3 }} // = `This is a`
```

### Numbers
#### Absolute Value
Return the magnitude of `a`.
```handlebars
{{ abs -1 }} // = `1`
```

#### Add
Return the sum of `a` plus `b`
```handlebars
{{ add 10 2 }} // = `2`
// or
{{ plus a b }}
```

#### Ceil
Round a decimal value up to the closest whole number.
```handlebars
{{ ceil 7.1 }} // = `8`
```

#### Divide
Divide `a` by `b`
```handlebars
{{ divide 20 10 }} // = `2`
```

#### Floor
Round a decimal value down to the closest whole number.
```handlebars
{{ floor 5.14 }} // = `5`
```

#### Subtract
Return the difference of `a` minus `b`.
```handlebars
{{ subtract 5 4 }} // = `20`
// or
{{ minus a b }}
```

#### Multiply 
Return the product of `a` times `b`. You can pass in an unlimited number of values to multiply together.
```handlebars
{{ multiply 10 20 }} // = `200`
// or
{{ times a b }}
```

#### Random
Generate a random number between two values
```handlebars
{{ random 10 20 }} // Might return `15`
```

#### Remainder
Get the remainder when `a` is divided by `b`.
```handlebars
{{ remainder 5 4 }} // = `1`
```

#### Round
Round the given decimal number to the closest whole number
```handlebars
{{ round 3.4 }} // = `3`
```

#### Number Format
Format a string given the provided criteria. This is useful for formatting a number so that it makes sense given the context or the users locale.

Format: `{{ numberFormat value locale style currency }}`
Parameters:
- `value`: The number to format
- `locale`: The users locale to display the number accordingly
- `style`: Either `currency` or `percent` or blank. Adding this parameter will modify the number to be displayed accordingly
- `currency`: You must set the `style` to `currency` for this to take effect. If set the currency symbol will be included in the formatted value.

Examples:
```handlebars
// Decimal
{{ numberFormat 123456.789 "de-DE" }} // = `123.456,789`
{{ numberFormat 123456.789 "en-US" }} // = `123,456.789`

// Currency
{{ numberFormat 4.12 "en" "currency" "USD" }} // = `$4.12`

// Percent
{{ numberFormat .41 "en" "percent" }} // = `41%`
```

### Lists
#### Wrap
Takes a given value and if it's not a array (list), it wraps the value in an array to guarantee that the response will always be an array.
```handlebars
{{ wrap 10 }} // = `[10]`

{{ wrap [10] }} // = `[10]`
```

#### First
Returns the first item of a list.
```handlebars
{{ first [20, 10] }} // = `20`
```

#### Is Array
Returns true if the value is an array (list).
```handlebars
{{ isArray [10] }} // = true
```

#### Item At
Return the item from a list at the provided index. Note, the index starts at zero not one.
```handlebars
{{ itemAt [3, 9, 4, 20] 2 }} // = `4`
```

#### Join
Join all elements of a list into a string, optionally using a given separator.
```handlebars
{{ join ["hello", "again"] }} // = `hello again`
```

#### Last
Returns the last item of a list.
```handlebars
{{ last [20, 9, 11] }} // = `11`
```

#### Length
Returns the number of items in the provided list.
```handlebars
{{ length [4, 9, 8, 11, 5] }} // = `5`
```

#### Reverse
Reverse the elements in a list, or the characters in a string.
```handlebars
{{ reverse [11, 20, 5] }} // = `[5, 20, 11]`
```

#### Sort
Sort the given list in the provided order.

Format: `{{ sort array direction }}`
Parameters:
- `array`: The list of items to be sorted
- `direction`: What direction to sort the array, accepted values are either `asc` for ascending or `desc` for descending.

```handlebars
{{ sort [10, 80, 4, 7] 'asc' }} // = `[4, 7, 10, 80]`
```


### Dates
#### Now
Returns the current date time in the format and timezone provided.

Format: `{{ now format timezone }}`
Parameters:
- `format`: The date format to use for the returned value. Defaults to `yyyy-MM-dd HH:mm:ss`
- `timezone`: What timezone to use for the returned value. Defaults to `UTC`

```handlebars
{{ now }} // = `2023-07-04 12:22:32`

{{ now "MM/dd/yyyy" }} // = `07/04/2023`

{{ now "MM/yyyy" "America/Chicago" }} // = `07/2023`
```

#### Format
Takes a given date and formats it to the provided format and timezone.

Format: `{{ dateFormat format timezone }}`
Parameters:
- `format`: The date format to use for the returned value. Defaults to `yyyy-MM-dd HH:mm:ss`
- `timezone`: What timezone to use for the returned value. Defaults to `UTC`

```handlebars
{{ dateFormat "MM/dd/yyyy" }} // = `07/04/2023`

{{ dateFormat "MM/yyyy" "America/Chicago" }} // = `07/2023`
```

#### Set
Set a given component of a date to a provided value.

Format: `{{ setDate date unit value }}`
Parameters:
- `date`: The date you are wanting to manipulate.
- `unit`: The component unit of a date (`years`, `months`, `days`, `hours`, `minutes`).
- `value`: How many of the given unit as a number.

```handlebars
{{ setDate "2023-07-05 12:00:00" "days" 1 }} // `2023-07-01 12:00:00`

{{ setDate "now" "years" 2022 }}
```

#### Addition
Perform date math on a given date by adding some unit to the date.

```handlebars
{{ addDate "1970-01-15" 1 "months" }} // = `1970-02-15`
```

#### Subtraction
Perform date math on a given date by subtracting some unit to the date.

```handlebars
{{ subDate "1974-01-23" 1 "months" }} // = `1973-12-23`
```

#### Next Date
Get the date of the next occurance of a given day of week from a provided date.

Format: `{{ nextDate date day }}`
Parameters:
- `date`: The date to use as the starting point.
- `day`: The two letter abbreviation of the day of the week to seek (`mo`, `tu`, `we`, `th`, `fr`, `sa`, `su`).

```handlebars
{{ nextDate "now" "mo" }} // Returns the next monday
```

#### Date Difference
Get the distance between two days in the provided unit.

Format: `{{ dateDiff date date2 unit }}`
Parameters:
- `date`: The later date
- `date2`: The earlier date
- `unit`: What unit to get the difference in (ie `hours`, `minutes`)

```handlebars
{{ dateDiff "2023-06-05 12:00:00" "2023-06-01 12:00:00" "days" }} // = `1`
```

### Urls
#### Encode URI
Encodes a Uniform Resource Identifier (URI) component by replacing each instance of certain characters by one, two, three, or four escape sequences representing the UTF-8 encoding of the character.
```handlebars
{{ encodeURI url }}
```

#### Escape
Escape the given string by replacing characters with escape sequences. Useful for allowing the string to be used in a URL, etc.
```handlebars
{{ escape str }}
```

#### Decode URI
Decode a Uniform Resource Identifier (URI) component.
```handlebars
{{ decodeURI url }}
```

### Subscription

#### Unsubscribe Email
Get a url to unsubscribe a user from a given email subscription channel.
```handlebars
{{ unsubscribeEmailUrl }}
```

#### Preference Center
Get a url to navigate a user to a page where they can manage what subscription channels they are subscribed to.
```handlebars
{{ preferencesUrl }}
```
