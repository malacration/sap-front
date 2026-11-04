# syntax=docker/dockerfile:1
FROM node:26.13.0-bookworm-slim AS dependencies
WORKDIR /app
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json ./
COPY summernote ./summernote
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund && \
    npm rebuild admin-lte esbuild --no-audit --no-fund

FROM dependencies AS build
COPY . .
RUN cp src/config.example src/config && npm run web:build

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80
COPY entrypoint-config.sh /docker-entrypoint.d/
RUN apk add --no-cache curl && chmod +x /docker-entrypoint.d/entrypoint-config.sh
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf
