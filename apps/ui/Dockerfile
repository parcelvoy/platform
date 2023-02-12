# --------------> The compiler image
FROM node:16 AS compile
WORKDIR /usr/src/app/apps/ui
COPY ./tsconfig.base.json /usr/src/app
COPY ./apps/ui ./
RUN npm ci
RUN npm run build

# --------------> The production image
FROM nginx:1.23.1-alpine
EXPOSE 80
COPY --from=compile /usr/src/app/apps/ui/docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=compile /usr/src/app/apps/ui/build /usr/share/nginx/html