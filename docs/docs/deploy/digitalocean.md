---
title: Digital Ocean
---

This page guides you through deploying Parcelvoy Open-Source on a Digital Ocean droplet by setting up the deployment environment, installing and starting Parcelvoy, and connecting it to the droplet.

## Requirements
- A $14/mo droplet or larger. While you can run it on a smaller droplet, performance may not be optimal.

## Setup
1. [Create a DigitalOcean droplet](https://docs.digitalocean.com/products/droplets/how-to/create/) running Ubuntu
2. Connect to the droplet either through SSH or using the Droplet Console
3. Update the available packages and install Docker
```sh
sudo apt update
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt install docker-ce
sudo systemctl status docker
sudo usermod -aG docker ${USER}
su - ${USER}
```

4. Install `docker-compose`
```sh
sudo apt install docker-compose-plugin
docker compose version
```

5. Download Parcelvoy configuration:
```
mkdir parcelvoy && cd parcelvoy
wget https://raw.githubusercontent.com/parcelvoy/platform/master/{.env.example,docker-compose.yml}
```

6. Setup environment variables
```
mv .env.example .env
```

For default installations, security is set to `basic` which only allows for a single user. Before proceeding please update the email, password and app secret to not be their default values.

```
APP_SECRET=//Please pick a random value at least 16 characters in length
AUTH_BASIC_EMAIL=test@parcelvoy.com
AUTH_BASIC_PASSWORD=password
```

This file also lets you use a separate database, change what queue is being used or setup SSO.

By default the port is configured to use `3000` for the UI and API. You can modify this by setting `UI_PORT`.

7. Bring containers online
```
docker compose up -d # run the Docker container
```

8. Setup firewall
Based on what port you are using for the UI portion, you will want to make sure you have configured that port to be open as well in your firewall.
