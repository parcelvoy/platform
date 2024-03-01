<br />
<div align="center">
  <a href="https://parcelvoy.com" target="_blank">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png#gh-dark-mode-only">
        <img src=".github/assets/logo-light.png#gh-light-mode-only" width="360" alt="Logo"/>
    </picture>
  </a>
</div>

<h1 align="center">Open Source Multi-Channel Marketing</h1>

<p align="center">Engage your customers through effortless communication.</p>

<br />

## Features
- 💬 **Cross Channel Messaging** Send data-driven emails, push notifications and text messages.
- 🛣 **Journeys** Build complex journeys with our drag-and-drop builder to schedule, trigger and segment users.
- 👥 **Segmentation** Create dynamic lists to target users matching any event or user based criteria in real time.
- 📣 **Campaigns** Build campaigns that target specific lists of users and go out at pre-defined times.
- 🔗 **Integrations** Connect Parcelvoy to your applications using our easy to use SDKs and APIs.
- 🔒 **Secure** SSO (SAML/OpenID) is provided out of the box, no extra bolts or add-ons.
- 📦 **Open Source** Easy to setup and get running in your own cloud.

## 🚀 Deployment

You can run Parcelvoy locally or in the cloud easily using Docker.

### Render

You can do a one-click deploy on Render using the button below:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/parcelvoy/platform)

Make sure to set the `BASE_URL` environment variable to the URL of the web server.

### Docker Compose

To get up and running quickly to try things out, copy our latest `docker-compose.yml` and `.env` file onto your machine and go!
```
mkdir parcelvoy && cd parcelvoy
wget https://raw.githubusercontent.com/parcelvoy/platform/master/{.env.example,docker-compose.yml}
mv .env.example .env
docker compose up -d # run the Docker container
```

Login to the web app at http://localhost:3000 by entering the default credentials found in the copied `.env` file.

```
AUTH_BASIC_EMAIL=test@parcelvoy.com
AUTH_BASIC_PASSWORD=password
```

**Note:** We would recommend changing these default credentials as well as your `APP_SECRET` before ever using Parcelvoy in production.

For full documentation on the platform and more information on deployment, check out our docs.

**[Explore the Docs »](https://docs.parcelvoy.com)**

### Contributing
You can report bugs, suggest features, or just say hi on [Github discussions](https://github.com/parcelvoy/platform/discussions/new/choose) 
