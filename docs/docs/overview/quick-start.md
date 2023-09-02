# Quick Start
You can run Parcelvoy locally or in the cloud easily using Docker. For this quickstart we will be using Docker Compose, but you can also provide each of the components yourself.

We'll run you through the basics of how to get up and running quickly, for more specific installation steps on different platforms please check out our deployment section.

## Requirements
- An instance or virtual machine running Linux with at least 4GB of RAM
- Docker and Docker Compose are installed and available

## Installation

### 1. Download Parcelvoy
Copy our latest `docker-compose.yml` and `.env.example` file onto your machine:

```
mkdir parcelvoy && cd parcelvoy
wget https://raw.githubusercontent.com/parcelvoy/platform/master/{.env.example,docker-compose.yml}
```

### 2. Setup Environment Variables
An example environment variables file was downloaded to act as a base for the Docker Compose deployment. The first step is to copy this to `.env`
```
mv .env.example .env
```

For default installations, security is set to `basic` which only allows for a single user. Before proceeding please update the email, password and app secret to not be their default values.

```
APP_SECRET=//Please pick a random value at least 16 characters in length
AUTH_BASIC_EMAIL=test@parcelvoy.com
AUTH_BASIC_PASSWORD=password
```

### 3. Startup Docker Compose
```
docker compose up -d # run the Docker container
```

## Usage
Once Docker Compose boots up, it will start the initial database migration to get everything up and running. This should only take a minute, after which you are ready to go!

You can login to the web app at [http://localhost:3000](http://localhost:3000) by entering the default credentials you set in your `.env` file.

### Onboarding
After login, you'll be prompted to go through onboarding. This will get you setup with your first project. 

### Integrations
Parcelvoy at its core is an orchestration service that lets you determine how, when and to whom to send messages. Different mediums of messages as well as different platforms require integrations in order for them to work. 

Check out our [providers](../providers) section for instructions on how to get each one setup.

### How To
For more indepth tutorials on all of the functionality in Parcelvoy, make sure to checkout our How To section.
