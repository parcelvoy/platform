---
title: Design
---

# Design a Campaign
Each campaign is made up of a series of templates, each representing a given locale (language). After your campaign has been created, you can navigate to the `Design` tab to get started and create a template. 

![Design Campaign](/img/campaigns_design.png)

## Create Template
Selecting `Create Template` will open a modal with various options depending on the channel of the campaign, but all of them require selecting a locale. If you dont have any already, create one, otherwise pick the locale you are targeting from the list!

![Design Campaign Modal](/img/campaigns_design_template.png)

### Locales
A locale is a set of parameters that defines the user's language, region and any special variant. They can be anything from as broad a category as a language at large (`es` for Spanish) to as specific as a dialect (`en_PH` for English from the Philippines).

## Design
Once you have created a template you can begin designing it! Each channel that a campaign can be sent over has different editors that can be used to customize what you are sending.

### Email
You have by far the most customizeability when sending emails. You are able to adjust the entire design to be anything you would like. There are two different options for designing emails and the editor will vary based on your selection.

#### Visual
The visual editor provides you with a drag-and-drop interface for crafting emails without having to write any code. On the right hand side you are provided with different basic building blocks which you can drag in. Each block can then be customized to have specific styles or layouts.

![Design Campaign Visual](/img/campaigns_design_visual.png)

#### Code
If you select to code the email yourself, you are given a code editor window that you can use. This editor allows for many of the conveniences of modern code editors like code suggestions and collapsing. You are also able to import uploaded images directly. Handlebars templating can be used throughout to autopopulate data directly from the user.

![Design Campaign Code](/img/campaigns_design_code.png)

### Text
There is no customizeability available for text messages, the only thing you can configure is the body. The provided field accepted Handlebars so you can include user attributes as desired. To edit the body of the text, just hit the `Edit` button in the left hand column.

By default, the render of the message shows you what it would look like inside of a phone.

![Design Campaign Text](/img/campaigns_design_text.png)

#### Opt Out
Carriers typically require you to send opt out verbiage to a user so they know how they can stop receiving messages. Parcelvoy handles users unsubscribing from receiving text messages automatically for you if you've appropriately configured your provider.

The opt out verbiage can be configured under project settings and will only be sent included in the very first text message you send to a user. Subsequent messages will not include it.

### Push Notification
Push notification vary in design OS by OS and phone by phone. Every design however contains the same two basic building blocks: `title` and `body`. 

All fields availabe on push notifications allow for Handlebars templating.

The `deeplink` field will cause the app to automatically navigate to that URL when a user opens the push notification.

If you want to pass custom information down to your application so that you can process it, you can utilize the `Raw JSON` field.

![Design Campaign Push](/img/campaigns_design_push.png)
