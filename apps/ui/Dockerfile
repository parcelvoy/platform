# --------------> The build image
FROM node:16-alpine AS build
WORKDIR /usr/src/app
COPY . /usr/src/app/
RUN npm ci --only=production && npm run build

# --------------> The production image
FROM nginx:1.23.1-alpine
EXPOSE 80
COPY ./docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/app/build /usr/share/nginx/html