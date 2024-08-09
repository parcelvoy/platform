---
title: AWS EC2
---
# Deploy Parcelvoy on AWS (Amazon EC2)

This page guides you through deploying Parcelvoy Open-Source on an Amazon EC2 instance by setting up the deployment environment, installing and starting Parcelvoy, and connecting it to the Amazon EC2 instance.

## Requirements​
- A t3.medium instance or larger. While you can run it on smaller instances, performance may not be optimal.
- [Create and download an SSH key to connect to the instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html)

## Setup
1. SSH into your instance or use Amazon EC2 Instance Connect
2. Install Docker
```sh
sudo yum update -y
sudo yum install -y docker containerd git screen
sudo service docker start
sudo usermod -a -G docker $USER
```

3. Install `docker-compose`
```sh
wget https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)
sudo mv docker-compose-$(uname -s)-$(uname -m) /usr/libexec/docker/cli-plugins/docker-compose
chmod +x /usr/libexec/docker/cli-plugins/docker-compose
sudo systemctl enable docker.service --now
docker compose version
```

4. Download Parcelvoy configuration:
```
mkdir parcelvoy && cd parcelvoy
wget https://raw.githubusercontent.com/parcelvoy/platform/master/{.env.example,docker-compose.yml}
```

5. Setup environment variables
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

6. Bring containers online
```
docker compose up -d # run the Docker container
```

7. Setup security groups
Based on what port you are using for the UI portion, you will want to make sure you have configured that port to be open as well in your security groups.

8. Upgrading versions
:::note
If you are running a single instance of Parcelvoy you will experience downtime when upgrading versions, it's recommended for high availability to run Parcelvoy in an auto-scaling group with rolling deployments.
:::

```
docker compose down
docker compose pull
docker compose up -d
```