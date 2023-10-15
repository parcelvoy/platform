# PostHog
Parcelvoy supports sending events to PostHog. Follow the instructions below to setup.

1. Open [PostHog](https://app.posthog.com) and navigate to `Project settings`
2. Scroll down to the `Project Variables` section and copy the `Project API Key` for later.
4. Navigate to the Parcelvoy integrations page, hit `Add Integration` and select the `PostHog` integration.
5. Enter the copied key into the `API Key` field.
6. If you are self hosting, please enter the host URL of your installation, otherwise you can leave that field blank or enter `https://app.posthog.com`
7. Check `Is Default` if you would like this to be where all analytic events are sent (this will override any other analytic integrations).
8. Save the integration and events will start sending immediately.