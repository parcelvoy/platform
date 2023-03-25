# Parcelvoy
Engage your customers through effortless communication.

## Features
- 💬 **Cross Channel Messaging** Send data-driven emails, push notifications and text messages.
- 🛣 **Journeys** Build complex journeys with our drag-and-drop builder to schedule, trigger and segment users.
- 👥 **Segmentation** Create dynamic lists to target users matching any event or user based criteria in real time.
- 📣 **Campaigns** Build campaigns that target specific lists of users and go out at pre-defined times.
- 🔗 **Integrations** Connect Parcelvoy in to your applications using out easy to use SDKs and APIs.
- 🔒 **Secure** SSO (SAML/OpenID) is provided out of the box, no extra bolts or add-ons.
- 📦 **Open Source** Easy to setup and get running in your own cloud.

## 🚀 Getting Started

You can run Parcelvoy locally or in the cloud easily using Docker.

To get up and running quickly to try things out, copy our latest `docker-compose.yaml` and `.env` file onto your machine and go!
```
mkdir parcelvoy && cd parcelvoy
wget https://raw.githubusercontent.com/parcelvoy/parcelvoy/master/{.env,docker-compose.yaml}
docker compose up -d # run the Docker container
```

Login to the web app at http://localhost:3000 by entering the default credentials found in your .env file.

```
AUTH_BASIC_USERNAME=parcelvoy
AUTH_BASIC_PASSWORD=password
```

We would recommend changing these default credentials as well as your `APP_SECRET` before ever using Parcelvoy in production.

For full documentation on the platform and more information on deployment, check out our docs.

**[Explore the Docs »](https://docs.parcelvoy.com)**
