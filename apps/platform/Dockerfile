# --------------> The compiler image
FROM node:16 AS compile
WORKDIR /usr/src/app/apps/platform
COPY ./tsconfig.base.json /usr/src/app
COPY ./apps/platform ./
RUN npm ci
RUN npm run build

# --------------> The build image
FROM node:16 AS build
WORKDIR /usr/src/app
COPY --from=compile /usr/src/app/apps/platform/package*.json ./
COPY --from=compile /usr/src/app/apps/platform/build ./
COPY --from=compile /usr/src/app/apps/platform/db ./db
COPY --from=compile /usr/src/app/apps/platform/scripts ./scripts
RUN npm ci --only=production

# --------------> The production image
FROM node:16-alpine
RUN apk add dumb-init
ENV NODE_ENV="production"
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app ./
RUN chmod 755 ./scripts/entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./scripts/entrypoint.sh", "--"]
CMD ["dumb-init", "node", "index.js"]
