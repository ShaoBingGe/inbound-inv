# syntax=docker/dockerfile:1.7
# ---------- 构建 ----------
FROM node:20-alpine AS build
WORKDIR /app
# 内网可通过 --build-arg NPM_REGISTRY=https://registry.npmmirror.com 指定镜像源
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY"
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .
RUN npm run build

# ---------- 运行 ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# 以非 root 用户（uid 101）运行，监听 8080
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY deploy/docker/config.js.template /usr/share/nginx/config.js.template
COPY deploy/docker/40-app-config.sh /docker-entrypoint.d/40-app-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

USER root
RUN chmod +x /docker-entrypoint.d/40-app-config.sh \
  && rm -f /usr/share/nginx/html/config.js \
  && ln -s /tmp/app-config/config.js /usr/share/nginx/html/config.js \
  && mkdir -p /tmp/app-config && chown -R 101:101 /tmp/app-config
USER 101

ENV APP_ENV=prod \
    API_BASE_URL=/api \
    AGENT_PLATFORM_BASE_URL=/agent-api \
    DATA_MODE=live \
    DEFAULT_LANG=zh \
    AUTH_MODE=oidc \
    OIDC_PROVIDERS_JSON='[]' \
    OIDC_CLAIMS_JSON='{"roles":"roles","countries":"dc_scope","tenant":"tenant","name":"name","email":"email"}'

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
