#!/bin/sh

## Migrate the database
node ./migrate.js latest

# Hand off to the CMD
exec "$@"