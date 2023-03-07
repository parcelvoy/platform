# --------------> The compiler image
FROM node:16 AS compile
WORKDIR /usr/src/app/apps/platform
COPY ./tsconfig.base.json /usr/src/app
COPY ./package-lock.json /usr/src/app/apps/platform
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
COPY --from=compile /usr/src/app/apps/platform/public ./public 
RUN npm ci --only=production

# --------------> The production image
FROM node:16-alpine
RUN apk add dumb-init
ENV NODE_ENV="production"
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app ./
EXPOSE 3001
CMD ["dumb-init", "node", "index.js"]
