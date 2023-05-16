# --------------> The compiler image
FROM node:18 AS compile
WORKDIR /usr/src/app/apps/ui
COPY ./tsconfig.base.json /usr/src/app
COPY ./apps/ui ./
RUN npm ci
RUN npm run build

# --------------> The production image
FROM nginx:1.23.4-alpine
EXPOSE 3000
COPY --from=compile /usr/src/app/apps/ui/docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=compile /usr/src/app/apps/ui/build /usr/share/nginx/html
COPY --from=compile /usr/src/app/apps/ui/scripts /usr/share/nginx/html
WORKDIR /usr/share/nginx/html
RUN apk add --no-cache bash
RUN chmod +x env.sh
CMD ["/bin/bash", "-c", "/usr/share/nginx/html/env.sh && nginx -g \"daemon off;\""]