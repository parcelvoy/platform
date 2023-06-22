# Deploy
Deploying Parcelvoy is easy! Each component of the platform has its own Docker image associated with. We recommend different approaches based on your expected scale.

While Docker Compose is the fastest way to get up and running, we recommend at least running your database on a separate server to make future scaling easier.

## Quick Deploy
The fastest way to get up and running is by using Docker Compose. Every component including the database is included in the compose file and you'll be up and running quickly.

## Scalable Deploy
Every part of Parcelvoy is developed to be able to scale to multiple servers as your use increases. We've broken down the major components you'll want to separate to provide a truly scalable solution:

1. Database
2. Queue
3. Servers
4. UI