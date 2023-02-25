---
title: AWS EC2
---
# Deploy Parcelvoy on AWS (Amazon EC2)

This page guides you through deploying Parcelvoy Open-Source on an Amazon EC2 instance by setting up the deployment environment, installing and starting Airbyte, and connecting it to the Amazon EC2 instance.

## Requirements​
- A t3.medium instance or larger. While you can run it on smaller instances, performance may not be optimal.
- [Create and download an SSH key to connect to the instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html)

## Setup
1. SSH into your instance or use Amazon EC2 Instance Connect
2. Install Docker
```sh
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker $USER
```

3. Install `docker-compose`
```sh
sudo yum install -y docker-compose-plugin
docker compose version
```

4. Install Parcelvoy by running the following:
```
mkdir parcelvoy && cd parcelvoy
wget https://raw.githubusercontent.com/parcelvoy/parcelvoy/master/{.env,docker-compose.yaml}
docker compose up -d # run the Docker container
```

5. Setup environment variables
```
sudo vim .env
```
The database and queue come pre-configured but SSO needs to be setup. Pick your authentication approach and set the required environment variables.

6. Setup security groups
